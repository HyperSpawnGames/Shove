import { describe, expect, it } from "@rbxts/jest-globals";
import type { GiantDefinition } from "../../giants";
import { tierTuning } from "../../roster/tuning";
import { giantClearZone, laneClearZone } from "../../staircase";
import { Footprint, giantFootprint, layoutTerraces, SPACER_FOOTPRINT, TerraceLayout } from "../../world-layout";
import type { ClearZone } from "../types";
import {
	countParts,
	FrostTerrace,
	marginFor,
	MAX_FROST_PARTS,
	overlaps,
	overlapsInPlan,
	planFrost,
	worldBounds,
} from "./frost-layout";
import type { FrostProp, PartSpec } from "./frost-props";

function giant(scale: number): GiantDefinition {
	return { modelId: "Test", displayName: "Test", scale, recommendedStrength: 1, resistancePerSecond: 0, winsPayout: 1 };
}

/**
 * A staircase like the real one: four full quads below, a spacer after each,
 * then the frost giants at `scales`. Returns the frost terraces and their
 * clear zones, as the encounter service hands them over.
 */
function frostStretch(scales: readonly number[]): { terraces: TerraceLayout[]; clearZones: ClearZone[] } {
	const footprints: Footprint[] = [];
	for (let quad = 0; quad < 4; quad++) {
		for (let i = 0; i < 4; i++) footprints.push(giantFootprint(tierTuning(quad * 4 + i).scale));
		footprints.push(SPACER_FOOTPRINT);
	}
	for (const scale of scales) footprints.push(giantFootprint(scale));
	const layouts = layoutTerraces(footprints);
	const terraces: TerraceLayout[] = [];
	const clearZones: ClearZone[] = [];
	scales.forEach((scale, i) => {
		const layout = layouts[footprints.size() - scales.size() + i];
		terraces.push(layout);
		clearZones.push(giantClearZone(giant(scale), layout), laneClearZone(layout));
	});
	return { terraces, clearZones };
}

const FULL = [16, 17, 18, 19].map((index) => tierTuning(index).scale);
const CASES: { name: string; scales: number[] }[] = [
	{ name: "four terraces", scales: FULL },
	{ name: "one terrace", scales: [FULL[0]] },
	{ name: "two big terraces", scales: [6.6, 6.6] },
	{ name: "three small terraces", scales: [5.6, 5.7, 5.8] },
];

function everyPart(
	plan: readonly FrostTerrace[],
	visit: (entry: FrostTerrace, prop: FrostProp, part: PartSpec) => void,
) {
	for (const entry of plan) for (const prop of entry.props) for (const part of prop.parts) visit(entry, prop, part);
}

function propBounds(prop: FrostProp) {
	let result = worldBounds(prop.parts[0].cframe, prop.parts[0].size);
	for (const part of prop.parts) {
		const box = worldBounds(part.cframe, part.size);
		result = { min: result.min.Min(box.min), max: result.max.Max(box.max) };
	}
	return result;
}

const UP_IN_THE_AIR = new Set<FrostProp["kind"]>(["snowfall", "icicles"]);

describe("planFrost", () => {
	it("builds nothing without terraces", () => {
		expect(planFrost([], []).size()).toBe(0);
	});

	for (const { name, scales } of CASES) {
		describe(`with ${name}`, () => {
			const { terraces, clearZones } = frostStretch(scales);
			const plan = planFrost(terraces, clearZones);
			const zones = clearZones.map((zone) => worldBounds(zone.cframe, zone.size));

			it("keeps every collidable part out of every clear zone", () => {
				let collidable = 0;
				everyPart(plan, (_, __, part) => {
					if (!part.collide) return;
					collidable += 1;
					const box = worldBounds(part.cframe, part.size);
					for (const zone of zones) expect(overlaps(box, zone)).toBe(false);
				});
				expect(collidable).toBeGreaterThan(0);
			});

			it("keeps every part but the snowfall clear of the zones in plan view, tall ones by the view margin", () => {
				everyPart(plan, (_, prop, part) => {
					if (prop.kind === "snowfall") return;
					const box = worldBounds(part.cframe, part.size);
					for (const zone of zones) expect(overlapsInPlan(box, zone, marginFor(part) - 0.01)).toBe(false);
				});
			});

			it("floats the snowfall above every clear zone, nothing solid, knowing its drop to the floor", () => {
				let sheets = 0;
				everyPart(plan, (entry, prop, part) => {
					if (prop.kind !== "snowfall") return;
					sheets += 1;
					expect(part.collide).toBe(false);
					// The emitter times every flake to land from this height.
					expect(math.abs(part.cframe.Y - entry.terrace.floorY - (part.drop ?? 0))).toBeLessThan(0.01);
					const box = worldBounds(part.cframe, part.size);
					for (const zone of zones) expect(overlaps(box, zone)).toBe(false);
				});
				expect(sheets).toBe(scales.size());
			});

			it("stands every ground prop on its own terrace", () => {
				for (const entry of plan) {
					const terrace = entry.terrace;
					for (const prop of entry.props) {
						if (UP_IN_THE_AIR.has(prop.kind)) continue;
						const box = propBounds(prop);
						expect(box.min.X >= -terrace.width / 2 && box.max.X <= terrace.width / 2).toBe(true);
						expect(box.min.Z >= terrace.backZ && box.max.Z <= terrace.frontZ).toBe(true);
						expect(math.abs(box.min.Y - terrace.floorY)).toBeLessThan(2);
					}
				}
			});

			it("hangs icicles from the terrace's edge, below the floor and clear of the ramp", () => {
				for (const entry of plan) {
					const terrace = entry.terrace;
					for (const prop of entry.props) {
						if (prop.kind !== "icicles") continue;
						const box = propBounds(prop);
						expect(box.max.Y).toBeLessThan(terrace.floorY + 0.02);
						expect(box.min.Z >= terrace.backZ && box.max.Z <= terrace.frontZ + 3).toBe(true);
						expect(box.min.X >= -terrace.width / 2 - 3 && box.max.X <= terrace.width / 2 + 3).toBe(true);
						// The ramp up arrives at the front edge across the lane: no icicle hangs into it.
						if (box.max.Z > terrace.frontZ) expect(box.min.X > 10 || box.max.X < -10).toBe(true);
						for (const part of prop.parts) expect(part.collide).toBe(false);
					}
				}
			});

			it("keeps ground props apart from each other", () => {
				for (const entry of plan) {
					const boxes = entry.props.filter((prop) => !UP_IN_THE_AIR.has(prop.kind)).map(propBounds);
					for (let i = 0; i < boxes.size(); i++) {
						for (let j = i + 1; j < boxes.size(); j++) expect(overlapsInPlan(boxes[i], boxes[j])).toBe(false);
					}
				}
			});

			it("raises spires and pines and freezes a pond on every terrace", () => {
				expect(plan.size()).toBe(scales.size());
				for (const entry of plan) {
					const kinds = entry.props.map((prop) => prop.kind);
					expect(kinds.includes("pond")).toBe(true);
					expect(kinds.filter((kind) => kind === "spire").size()).toBeGreaterThanOrEqual(1);
					expect(kinds.includes("pine")).toBe(true);
					expect(kinds.includes("crystals")).toBe(true);
					expect(kinds.includes("icicles")).toBe(true);
				}
			});

			it("keeps the pond flat and walk-through", () => {
				everyPart(plan, (entry, prop, part) => {
					if (prop.kind !== "pond") return;
					expect(part.collide).toBe(false);
					expect(worldBounds(part.cframe, part.size).max.Y).toBeLessThan(entry.terrace.floorY + 1);
				});
			});

			it("stays within the part budget", () => {
				expect(countParts(plan)).toBeLessThanOrEqual(MAX_FROST_PARTS);
				for (const entry of plan) {
					let parts = 0;
					for (const prop of entry.props) parts += prop.parts.size();
					expect(parts).toBeLessThanOrEqual(150);
				}
			});
		});
	}

	it("keeps to the budget however many terraces it is given", () => {
		const { terraces, clearZones } = frostStretch([5.6, 5.7, 5.8, 5.9, 6, 6.1, 6.2, 6.3, 6.4]);
		expect(countParts(planFrost(terraces, clearZones))).toBeLessThanOrEqual(MAX_FROST_PARTS);
	});

	it("lights the crystals", () => {
		const { terraces, clearZones } = frostStretch(FULL);
		let glowing = 0;
		everyPart(planFrost(terraces, clearZones), (_, __, part) => {
			if (part.effect === "crystalGlow") glowing += 1;
		});
		expect(glowing).toBeGreaterThan(0);
	});

	it("places the same glacier every time", () => {
		const { terraces, clearZones } = frostStretch(FULL);
		const describePlan = (plan: FrostTerrace[]) => {
			const lines: string[] = [];
			everyPart(plan, (_, __, part) => lines.push(`${part.name} ${tostring(part.cframe)} ${tostring(part.size)}`));
			return lines.join("\n");
		};
		expect(describePlan(planFrost(terraces, clearZones))).toBe(describePlan(planFrost(terraces, clearZones)));
	});
});
