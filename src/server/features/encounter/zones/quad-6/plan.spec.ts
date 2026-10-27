import { describe, expect, it } from "@rbxts/jest-globals";
import { tierTuning } from "../../roster/tuning";
import type { GiantDefinition } from "../../roster/types";
import { giantClearZone, laneClearZone } from "../../staircase";
import {
	giantFootprint,
	layoutTerraces,
	planSlots,
	RampLayout,
	rampBetween,
	SPACER_FOOTPRINT,
	TerraceLayout,
} from "../../world-layout";
import type { ClearZone } from "../types";
import { gateKeepOut, overlaps, rampKeepOut, separation, withinTerrace } from "./geometry";
import { ChaosPlanInput, EDGE_INSET, MAX_PARTS, planChaosZone, PLAN_GAP } from "./plan";

const CHAOS = 5;

function giant(scale: number): GiantDefinition {
	return {
		modelId: "Test",
		displayName: "Test",
		scale,
		recommendedStrength: 1,
		resistancePerSecond: 0.04,
		winsPayout: 1,
	};
}

/**
 * The Chaos zone's context as the encounter service builds it: real quads
 * and spacers below, `count` Chaos giants scaled by tierTuning or `scales`.
 */
function chaosInput(count: number, lowerQuads = 4, scales?: number[]): ChaosPlanInput {
	const sizes: number[] = [];
	for (let i = 0; i < CHAOS; i++) sizes.push(lowerQuads);
	sizes.push(count);
	const slots = planSlots(sizes);
	let chaosSeen = 0;
	const scaleOf = slots.map((slot) => {
		if (slot.kind !== "giant") return 0;
		if (slot.quadIndex === CHAOS && scales) return scales[chaosSeen++];
		return tierTuning(slot.giantIndex).scale;
	});
	const layouts = layoutTerraces(
		slots.map((slot, i) => (slot.kind === "giant" ? giantFootprint(scaleOf[i]) : SPACER_FOOTPRINT)),
	);
	const terraces: TerraceLayout[] = [];
	const ramps: RampLayout[] = [];
	const clearZones: ClearZone[] = [];
	slots.forEach((slot, index) => {
		if (slot.kind !== "giant" || slot.quadIndex !== CHAOS) return;
		const layout = layouts[index];
		terraces.push(layout);
		if (index > 0) ramps.push(rampBetween(layouts[index - 1], layout));
		clearZones.push(giantClearZone(giant(scaleOf[index]), layout), laneClearZone(layout));
	});
	return { terraces, ramps, clearZones };
}

const CASES: [string, ChaosPlanInput][] = [
	["one terrace", chaosInput(1)],
	["two terraces", chaosInput(2)],
	["three terraces", chaosInput(3)],
	["four terraces", chaosInput(4)],
	["four terraces at scale 8", chaosInput(4, 4, [8, 8, 8, 8])],
	["four terraces at the low end of the scales", chaosInput(4, 4, [6.9, 6.9, 6.9, 6.9])],
	["the first quad built, on the ground", chaosInput(4, 0, [6.88, 7.22, 7.58, 7.96])],
];

describe("planChaosZone", () => {
	it("dresses nothing without terraces", () => {
		expect(planChaosZone(chaosInput(0)).size()).toBe(0);
	});

	for (const [name, input] of CASES) {
		describe(name, () => {
			const props = planChaosZone(input);
			const hard = [...input.terraces.map(gateKeepOut), ...input.ramps.map(rampKeepOut)];

			it("stays within the part budget and dresses every terrace", () => {
				expect(props.size() <= MAX_PARTS).toBe(true);
				input.terraces.forEach((_, terrace) => {
					const own = props.filter((prop) => prop.terrace === terrace);
					expect(own.filter((prop) => prop.name === "RitualRing").size()).toBe(2);
					expect(own.filter((prop) => prop.name === "ObsidianSpike").size() >= 6).toBe(true);
					expect(own.filter((prop) => prop.name === "FloatingShard").size() >= 4).toBe(true);
				});
			});

			it("keeps every collidable prop out of the clear zones, with a gap seen from above", () => {
				for (const prop of props) {
					if (!prop.collidable) continue;
					for (const zone of input.clearZones) {
						expect(overlaps(zone, prop.cframe, prop.size)).toBe(false);
						expect(separation(zone, prop.cframe, prop.size, true) >= PLAN_GAP).toBe(true);
					}
				}
			});

			it("keeps everything but floor and cliff inlays off the lane and the pedestals, so the giants stay in view", () => {
				for (const prop of props) {
					if (prop.inlay) continue;
					for (const zone of input.clearZones)
						expect(separation(zone, prop.cframe, prop.size, true) >= PLAN_GAP).toBe(true);
				}
			});

			it("never makes an inlay collidable", () => {
				for (const prop of props) if (prop.inlay) expect(prop.collidable).toBe(false);
			});

			it("touches no ramp corridor and no gate wall", () => {
				for (const prop of props) for (const zone of hard) expect(overlaps(zone, prop.cframe, prop.size)).toBe(false);
			});

			it("keeps the dressing gap from the ramp corridors and gate walls too", () => {
				for (const prop of props) {
					if (prop.inlay) continue;
					for (const zone of hard) expect(separation(zone, prop.cframe, prop.size, true) >= PLAN_GAP).toBe(true);
				}
			});

			it("keeps each prop on its own terrace, or on its front face", () => {
				for (const prop of props) {
					const layout = input.terraces[prop.terrace];
					if (prop.name === "FaceCrack") {
						expect(prop.cframe.Position.Z > layout.frontZ).toBe(true);
						expect(prop.cframe.Position.Y < layout.floorY).toBe(true);
						expect(math.abs(prop.cframe.Position.X) < layout.width / 2).toBe(true);
					} else {
						expect(withinTerrace(layout, prop.cframe, prop.size, EDGE_INSET)).toBe(true);
					}
				}
			});

			it("places the same zone every time", () => {
				const again = planChaosZone(input);
				expect(again.size()).toBe(props.size());
				props.forEach((prop, i) => {
					expect(again[i].name).toBe(prop.name);
					expect(again[i].cframe.Position.sub(prop.cframe.Position).Magnitude).toBe(0);
				});
			});
		});
	}

	it("keeps the gate walls the staircase actually builds clear", () => {
		const input = chaosInput(4);
		const props = planChaosZone(input);
		for (const layout of input.terraces) {
			const wall = {
				cframe: new CFrame(0, layout.floorY + 7, layout.frontZ - 0.5),
				size: new Vector3(layout.width, 14, 1),
			};
			for (const prop of props) expect(overlaps(wall, prop.cframe, prop.size)).toBe(false);
		}
	});
});
