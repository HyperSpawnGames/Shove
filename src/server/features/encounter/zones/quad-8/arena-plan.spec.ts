import { describe, expect, it } from "@rbxts/jest-globals";
import type { GiantDefinition } from "../../giants";
import { tierTuning } from "../../roster/tuning";
import { giantClearZone, laneClearZone } from "../../staircase";
import {
	Footprint,
	giantFootprint,
	layoutTerraces,
	planSlots,
	RampLayout,
	rampBetween,
	SPACER_FOOTPRINT,
	TerraceLayout,
} from "../../world-layout";
import type { ClearZone } from "../types";
import { ArenaInput, CLEAR_GAP, PART_BUDGET, planNeonArena, PropSpec } from "./arena-plan";
import { Box, boxesOverlap, boxOf, keepClearBoxes, planGap } from "./geometry";

const QUAD = 7;
const ARENA_SCALES = [10.3, 10.8, 11.3, 11.8];

function giantOf(scale: number): GiantDefinition {
	return { modelId: "Test", displayName: "Test", scale, recommendedStrength: 1, resistancePerSecond: 0, winsPayout: 1 };
}

interface Synthetic {
	input: ArenaInput;
	clearZones: ClearZone[];
}

/**
 * The Neon Arena's slice of a synthetic staircase, gathered the way
 * EncounterService gathers a ZoneContext: real lower quads (at the tuning
 * curve's scales) and spacers below, then `arenaScales.size()` arena giants.
 */
function arenaOf(arenaScales: readonly number[], lowerQuads = QUAD): Synthetic {
	const sizes: number[] = [];
	for (let i = 0; i < QUAD; i++) sizes.push(i < lowerQuads ? 4 : 0);
	sizes.push(arenaScales.size());
	const slots = planSlots(sizes);

	const scales: number[] = [];
	let arenaIndex = 0;
	for (const slot of slots) {
		if (slot.kind !== "giant") continue;
		if (slot.quadIndex === QUAD) {
			scales.push(arenaScales[arenaIndex]);
			arenaIndex += 1;
		} else scales.push(tierTuning(slot.giantIndex).scale);
	}
	const footprints = slots.map((slot): Footprint =>
		slot.kind === "giant" ? giantFootprint(scales[slot.giantIndex]) : SPACER_FOOTPRINT,
	);
	const layouts = layoutTerraces(footprints);

	const terraces: TerraceLayout[] = [];
	const ramps: RampLayout[] = [];
	const clearZones: ClearZone[] = [];
	const zoneScales: number[] = [];
	slots.forEach((slot, index) => {
		if (slot.kind !== "giant" || slot.quadIndex !== QUAD) return;
		const layout = layouts[index];
		const scale = scales[slot.giantIndex];
		terraces.push(layout);
		zoneScales.push(scale);
		if (index > 0) ramps.push(rampBetween(layouts[index - 1], layout));
		clearZones.push(giantClearZone(giantOf(scale), layout), laneClearZone(layout));
	});

	return {
		input: { terraces, scales: zoneScales, keepClear: keepClearBoxes(clearZones, ramps, terraces) },
		clearZones,
	};
}

function named(props: readonly PropSpec[], name: string): PropSpec[] {
	return props.filter((spec) => spec.name === name);
}

const CASES: { label: string; scales: number[]; lowerQuads?: number }[] = [
	{ label: "no terraces", scales: [] },
	{ label: "one terrace", scales: [10.3] },
	{ label: "two terraces", scales: [10.3, 10.8] },
	{ label: "three terraces", scales: [10.3, 10.8, 11.3] },
	{ label: "four terraces", scales: ARENA_SCALES },
	{ label: "four oversized terraces", scales: [12, 12.5, 12.5, 12.5] },
	{ label: "four undersized terraces", scales: [9.5, 9.5, 9.8, 10] },
	{ label: "the arena alone, from the ground", scales: ARENA_SCALES, lowerQuads: 0 },
];

describe("planNeonArena", () => {
	for (const { label, scales, lowerQuads } of CASES) {
		describe(label, () => {
			const { input, clearZones } = arenaOf(scales, lowerQuads);
			const props = planNeonArena(input);
			const collidable = props.filter((spec) => spec.collidable);

			it("keeps every collidable prop a plan-view gap from every keep-clear box", () => {
				for (const spec of collidable) {
					const box = boxOf(spec.cframe, spec.size);
					for (const keep of input.keepClear) expect(planGap(box, keep)).toBeGreaterThanOrEqual(CLEAR_GAP);
				}
			});

			it("never overlaps a keep-clear box in 3D with a collidable prop", () => {
				for (const spec of collidable) {
					const box = boxOf(spec.cframe, spec.size);
					for (const keep of input.keepClear) expect(boxesOverlap(box, keep)).toBe(false);
				}
			});

			it("stays within the part budget", () => {
				expect(props.size()).toBeLessThanOrEqual(PART_BUDGET);
			});

			it("hides no giant: nothing opaque stands in a clear zone above the floor", () => {
				const views: Box[] = clearZones.map((zone) => {
					const box = boxOf(zone.cframe, zone.size);
					return { min: box.min.add(new Vector3(0, 0.5, 0)), max: box.max };
				});
				for (const spec of props) {
					if (spec.flush || spec.transparency >= 0.3) continue;
					const box = boxOf(spec.cframe, spec.size);
					for (const view of views) expect(boxesOverlap(box, view)).toBe(false);
				}
			});

			it("keeps each prop over its own terrace", () => {
				for (const spec of props) {
					const layout = input.terraces[spec.terrace];
					const box = boxOf(spec.cframe, spec.size);
					expect(box.max.X).toBeLessThanOrEqual(layout.width / 2 + 1);
					expect(box.min.X).toBeGreaterThanOrEqual(-layout.width / 2 - 1);
					expect(box.max.Z).toBeLessThanOrEqual(layout.frontZ + 1);
					expect(box.min.Z).toBeGreaterThanOrEqual(layout.backZ - 1);
				}
			});

			if (scales.size() > 0) {
				it("dresses both sides of every terrace", () => {
					for (const name of ["RopePost", "LightMast", "Bleacher", "Fan", "HoloRing"]) {
						for (let terrace = 0; terrace < scales.size(); terrace++) {
							const onTerrace = named(props, name).filter((spec) => spec.terrace === terrace);
							expect(onTerrace.filter((spec) => spec.cframe.X < 0).size()).toBeGreaterThan(0);
							expect(onTerrace.filter((spec) => spec.cframe.X > 0).size()).toBeGreaterThan(0);
						}
					}
				});

				it("hangs the championship banner on the top terrace only", () => {
					const banners = named(props, "ChampionshipBanner");
					expect(banners.size()).toBe(1);
					expect(banners[0].terrace).toBe(scales.size() - 1);
					expect(named(props, "BannerPylon").size()).toBe(2);
				});

				it("aims the light towers' lamps at the giants", () => {
					for (const lamp of named(props, "LampHead")) {
						const giant = input.terraces[lamp.terrace].giantPosition;
						const toGiant = new Vector3(giant.X, lamp.cframe.Y, giant.Z).sub(lamp.cframe.Position);
						const flatLook = new Vector3(lamp.cframe.LookVector.X, 0, lamp.cframe.LookVector.Z);
						expect(flatLook.Unit.Dot(toGiant.Unit)).toBeGreaterThan(0.99);
						expect(lamp.cframe.LookVector.Y).toBeLessThan(0);
					}
				});
			} else {
				it("builds nothing", () => {
					expect(props.size()).toBe(0);
				});
			}
		});
	}

	it("is deterministic", () => {
		const { input } = arenaOf(ARENA_SCALES);
		const first = planNeonArena(input);
		const second = planNeonArena(input);
		expect(second.size()).toBe(first.size());
		first.forEach((spec, i) => {
			expect(second[i].name).toBe(spec.name);
			expect(second[i].cframe.Position.FuzzyEq(spec.cframe.Position, 1e-6)).toBe(true);
			expect(second[i].color).toBe(spec.color);
		});
	});

	it("drops a collidable prop that a keep-clear box would reach", () => {
		const { input } = arenaOf([11]);
		const everything: Box = { min: new Vector3(-1e4, -1e4, -1e4), max: new Vector3(1e4, 1e4, 1e4) };
		const props = planNeonArena({ ...input, keepClear: [...input.keepClear, everything] });
		expect(props.filter((spec) => spec.collidable).size()).toBe(0);
	});
});
