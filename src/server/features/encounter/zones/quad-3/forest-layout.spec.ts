import { describe, expect, it } from "@rbxts/jest-globals";
import type { GiantDefinition } from "../../giants";
import { tierTuning } from "../../roster/tuning";
import { giantClearZone, laneClearZone } from "../../staircase";
import { Footprint, giantFootprint, layoutTerraces, SPACER_FOOTPRINT, TerraceLayout } from "../../world-layout";
import type { ClearZone } from "../types";
import {
	CLEARANCE,
	countParts,
	ForestTerrace,
	MAX_FOREST_PARTS,
	overlaps,
	overlapsInPlan,
	planForest,
	VIEW_MARGIN,
	worldBounds,
} from "./forest-layout";
import type { PartSpec } from "./forest-props";

function giant(scale: number): GiantDefinition {
	return { modelId: "Test", displayName: "Test", scale, recommendedStrength: 1, resistancePerSecond: 0, winsPayout: 1 };
}

/**
 * A staircase like the real one: two full quads below, a spacer after each,
 * then the forest's giants at `scales`. Returns the forest's terraces and
 * their clear zones, as the encounter service hands them over.
 */
function forestStretch(scales: readonly number[]): { terraces: TerraceLayout[]; clearZones: ClearZone[] } {
	const footprints: Footprint[] = [];
	for (let quad = 0; quad < 2; quad++) {
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

const FULL = [3.9, 4.1, 4.4, 4.7];
const CASES: { name: string; scales: number[] }[] = [
	{ name: "four terraces", scales: FULL },
	{ name: "one terrace", scales: [3.9] },
	{ name: "two big terraces", scales: [4.7, 4.7] },
	{ name: "three small terraces", scales: [3.6, 3.7, 3.8] },
];

function everyPart(plan: readonly ForestTerrace[], visit: (entry: ForestTerrace, part: PartSpec) => void) {
	for (const entry of plan) for (const prop of entry.props) for (const part of prop.parts) visit(entry, part);
}

describe("planForest", () => {
	it("builds nothing without terraces", () => {
		expect(planForest([], []).size()).toBe(0);
	});

	for (const { name, scales } of CASES) {
		describe(`with ${name}`, () => {
			const { terraces, clearZones } = forestStretch(scales);
			const plan = planForest(terraces, clearZones);
			const zones = clearZones.map((zone) => worldBounds(zone.cframe, zone.size));

			it("keeps every collidable part out of every clear zone", () => {
				let collidable = 0;
				everyPart(plan, (_, part) => {
					if (!part.collide) return;
					collidable += 1;
					const box = worldBounds(part.cframe, part.size);
					for (const zone of zones) expect(overlaps(box, zone)).toBe(false);
				});
				expect(collidable).toBeGreaterThan(0);
			});

			it("keeps every part, canopies and light included, clear of the zones from ground to sky", () => {
				everyPart(plan, (_, part) => {
					const box = worldBounds(part.cframe, part.size);
					const gap = part.overhead ? VIEW_MARGIN : CLEARANCE;
					for (const zone of zones) expect(overlapsInPlan(box, zone, gap - 0.01)).toBe(false);
				});
			});

			it("stands everything on the ground on its own terrace", () => {
				everyPart(plan, (entry, part) => {
					if (part.overhead) return;
					const box = worldBounds(part.cframe, part.size);
					const terrace = entry.terrace;
					expect(box.min.X >= -terrace.width / 2 && box.max.X <= terrace.width / 2).toBe(true);
					expect(box.min.Z >= terrace.backZ && box.max.Z <= terrace.frontZ).toBe(true);
					expect(math.abs(box.min.Y - terrace.floorY)).toBeLessThan(2);
				});
			});

			it("grows at least three tall trees on every terrace", () => {
				expect(plan.size()).toBe(scales.size());
				for (const entry of plan) {
					expect(entry.props.filter((prop) => prop.kind === "tree").size()).toBeGreaterThanOrEqual(3);
				}
			});

			it("stays within the part budget", () => {
				expect(countParts(plan)).toBeLessThanOrEqual(MAX_FOREST_PARTS);
			});
		});
	}

	it("keeps to the budget however many terraces it is given", () => {
		const { terraces, clearZones } = forestStretch([3.9, 4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7]);
		expect(countParts(planForest(terraces, clearZones))).toBeLessThanOrEqual(MAX_FOREST_PARTS);
	});

	it("lights a few mushrooms across the zone", () => {
		const { terraces, clearZones } = forestStretch(FULL);
		let glowing = 0;
		everyPart(planForest(terraces, clearZones), (_, part) => {
			if (part.effect === "glow") glowing += 1;
		});
		expect(glowing).toBeGreaterThan(0);
	});

	it("places the same forest every time", () => {
		const { terraces, clearZones } = forestStretch(FULL);
		const describePlan = (plan: ForestTerrace[]) => {
			const lines: string[] = [];
			everyPart(plan, (_, part) => lines.push(`${part.name} ${tostring(part.cframe)} ${tostring(part.size)}`));
			return lines.join("\n");
		};
		expect(describePlan(planForest(terraces, clearZones))).toBe(describePlan(planForest(terraces, clearZones)));
	});
});
