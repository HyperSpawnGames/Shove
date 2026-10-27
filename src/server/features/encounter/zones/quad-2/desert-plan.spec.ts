import { describe, expect, it } from "@rbxts/jest-globals";
import type { GiantDefinition } from "../../roster/types";
import { giantClearZone, laneClearZone } from "../../staircase";
import { giantFootprint, layoutTerraces, SPACER_FOOTPRINT, type TerraceLayout } from "../../world-layout";
import type { ClearZone } from "../types";
import { DESERT_SEED, MAX_ZONE_PARTS, oasisTerrace, planDesert, withinTerrace } from "./desert-plan";
import { blocksClearZone, boundsOverlap, boxBounds, type PartSpec } from "./part-spec";

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

/** A desert quad of giants at `scales`, laid out above a full quad 1 and its spacer, with its keep-clear boxes. */
function syntheticZone(scales: readonly number[]): { terraces: TerraceLayout[]; zones: ClearZone[] } {
	const below = [1.6, 2, 2.5, 3].map(giantFootprint);
	const layouts = layoutTerraces([...below, SPACER_FOOTPRINT, ...scales.map(giantFootprint)]);
	const terraces = scales.map((_, i) => layouts[below.size() + 1 + i]);
	const zones: ClearZone[] = [];
	terraces.forEach((layout, i) => zones.push(giantClearZone(giant(scales[i]), layout), laneClearZone(layout)));
	return { terraces, zones };
}

/** The plan's parts, split back into their terraces. */
function byTerrace(parts: readonly PartSpec[], perTerrace: readonly number[]): PartSpec[][] {
	const groups: PartSpec[][] = [];
	let start = 0;
	for (const count of perTerrace) {
		const group: PartSpec[] = [];
		for (let i = 0; i < count; i++) group.push(parts[start + i]);
		groups.push(group);
		start += count;
	}
	return groups;
}

const QUAD_SCALES = [3.1, 3.35, 3.6, 3.8];
const LAYOUTS = [[], [3.1], [3.1, 3.4], [3.1, 3.3, 3.55], QUAD_SCALES, [2.5, 2.5, 2.5, 2.5], [4.5, 4.6, 4.8, 5]];
const SEEDS = [DESERT_SEED, 1, 77, 12345];

describe("boxBounds", () => {
	it("turns with the box", () => {
		const bounds = boxBounds(CFrame.Angles(0, math.pi / 2, 0), new Vector3(2, 2, 10));
		expect(bounds.max.X).toBeCloseTo(5);
		expect(bounds.max.Z).toBeCloseTo(1);
	});

	it("does not count touching faces as overlap", () => {
		const a = boxBounds(new CFrame(0, 0, 0), new Vector3(2, 2, 2));
		const b = boxBounds(new CFrame(2, 0, 0), new Vector3(2, 2, 2));
		expect(boundsOverlap(a, b)).toBe(false);
		expect(boundsOverlap(a, b, 0.5)).toBe(true);
	});
});

describe("planDesert", () => {
	it("builds nothing without terraces", () => {
		expect(planDesert([], []).parts.size()).toBe(0);
	});

	it("keeps every collidable part out of every keep-clear box", () => {
		for (const scales of LAYOUTS) {
			const { terraces, zones } = syntheticZone(scales);
			for (const seed of SEEDS) {
				for (const part of planDesert(terraces, zones, seed).parts) {
					expect(blocksClearZone(part, zones)).toBe(false);
				}
			}
		}
	});

	it("keeps every part on its own terrace", () => {
		for (const scales of LAYOUTS) {
			const { terraces, zones } = syntheticZone(scales);
			for (const seed of SEEDS) {
				const plan = planDesert(terraces, zones, seed);
				byTerrace(plan.parts, plan.perTerrace).forEach((parts, i) => {
					for (const part of parts) expect(withinTerrace(part, terraces[i], 0)).toBe(true);
				});
			}
		}
	});

	it("stays within the part budget", () => {
		for (const scales of LAYOUTS) {
			const { terraces, zones } = syntheticZone(scales);
			for (const seed of SEEDS) expect(planDesert(terraces, zones, seed).parts.size() <= MAX_ZONE_PARTS).toBe(true);
		}
	});

	it("dresses every terrace", () => {
		const { terraces, zones } = syntheticZone(QUAD_SCALES);
		for (const seed of SEEDS) {
			const plan = planDesert(terraces, zones, seed);
			expect(plan.perTerrace.size()).toBe(4);
			for (const count of plan.perTerrace) expect(count).toBeGreaterThan(40);
		}
	});

	it("flanks every ramp top with two obelisks", () => {
		const { terraces, zones } = syntheticZone(QUAD_SCALES);
		const plan = planDesert(terraces, zones);
		for (const parts of byTerrace(plan.parts, plan.perTerrace)) {
			expect(parts.filter((part) => part.name === "ObeliskShaft").size()).toBe(2);
		}
	});

	it("puts the oasis on the second terrace, or the only one", () => {
		expect(oasisTerrace(0)).toBe(undefined);
		expect(oasisTerrace(1)).toBe(0);
		expect(oasisTerrace(4)).toBe(1);
		const { terraces, zones } = syntheticZone(QUAD_SCALES);
		const plan = planDesert(terraces, zones);
		const groups = byTerrace(plan.parts, plan.perTerrace);
		expect(groups[1].some((part) => part.name === "OasisWater")).toBe(true);
	});

	it("is the same desert every time for a seed", () => {
		const { terraces, zones } = syntheticZone(QUAD_SCALES);
		const first = planDesert(terraces, zones).parts;
		const second = planDesert(terraces, zones).parts;
		expect(second.size()).toBe(first.size());
		first.forEach((part, i) => {
			expect(second[i].name).toBe(part.name);
			expect(second[i].cframe.Position.sub(part.cframe.Position).Magnitude).toBe(0);
		});
	});
});
