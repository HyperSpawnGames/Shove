import { describe, expect, it } from "@rbxts/jest-globals";
import type { GiantDefinition } from "../../giants";
import { giantClearZone, laneClearZone } from "../../staircase";
import { giantFootprint, layoutTerraces, rampBetween } from "../../world-layout";
import type { ClearZone } from "../types";
import { allClear, overlapsZone, PartSpec } from "./part-spec";
import { extraClearZones, GRASSLAND_PART_BUDGET, GrasslandLayout, planGrassland } from "./plan";

/** Quad 1 as the staircase lays it out: the Noob on the ground, then Goblin, Viking and Baron. */
function quadOne(scales: number[]): GrasslandLayout {
	const terraces = layoutTerraces(scales.map((scale) => giantFootprint(scale)));
	const ramps = terraces.filter((_, i) => i > 0).map((terrace, i) => rampBetween(terraces[i], terrace));
	const clearZones: ClearZone[] = [];
	terraces.forEach((terrace, i) => {
		const giant: GiantDefinition = {
			modelId: "Test",
			displayName: "Test",
			scale: scales[i],
			recommendedStrength: 1,
			resistancePerSecond: 0.04,
			winsPayout: 1,
		};
		clearZones.push(giantClearZone(giant, terrace), laneClearZone(terrace));
	});
	return { terraces, ramps, clearZones };
}

const FULL = quadOne([1.6, 2, 2.5, 3]);

function block(cframe: CFrame, size: Vector3, collide = true): PartSpec {
	return {
		group: "Test",
		name: "Test",
		shape: "block",
		size,
		cframe,
		color: new Color3(),
		material: Enum.Material.Plastic,
		collide,
	};
}

describe("overlapsZone", () => {
	const zone = { cframe: new CFrame(0, 5, 0), size: new Vector3(10, 10, 10) };

	it("catches a block inside the box", () => {
		expect(overlapsZone(block(new CFrame(4, 5, 0), Vector3.one), zone)).toBe(true);
	});

	it("passes a block well outside the box", () => {
		expect(overlapsZone(block(new CFrame(8, 5, 0), Vector3.one), zone)).toBe(false);
	});

	it("counts a rotated block's corners", () => {
		const turned = new CFrame(6.3, 5, 0).mul(CFrame.Angles(0, math.pi / 4, 0));
		expect(overlapsZone(block(turned, new Vector3(2, 2, 2)), zone)).toBe(true);
	});

	it("tests a ball by its true distance", () => {
		const ball = { ...block(new CFrame(7, 12, 7), Vector3.one.mul(4)), shape: "ball" as const };
		// The corner of the box is sqrt(3) * 2.5 away from the ball's middle: more than its radius.
		expect(overlapsZone(ball, zone)).toBe(false);
	});
});

describe("planGrassland", () => {
	const parts = planGrassland(FULL);
	const keepClear = [...FULL.clearZones, ...extraClearZones(FULL)];

	it("keeps every solid part out of every keep-clear box", () => {
		const solid = parts.filter((part) => part.collide);
		expect(solid.size()).toBeGreaterThan(0);
		for (const part of solid) {
			const clear = allClear([part], keepClear);
			if (!clear) error(`${part.group}/${part.name} at ${part.cframe.Position} enters a keep-clear box`);
			expect(clear).toBe(true);
		}
	});

	it("stays within the part budget", () => {
		expect(parts.size()).toBeLessThanOrEqual(GRASSLAND_PART_BUDGET);
	});

	it("dresses every terrace", () => {
		for (let i = 1; i <= FULL.terraces.size(); i++) {
			expect(parts.filter((part) => part.group === `Terrace${i}` && part.collide).size()).toBeGreaterThan(10);
		}
	});

	it("is the same every run", () => {
		const again = planGrassland(FULL);
		expect(again.size()).toBe(parts.size());
		parts.forEach((part, i) => {
			expect(again[i].name).toBe(part.name);
			expect(again[i].cframe.Position.sub(part.cframe.Position).Magnitude).toBe(0);
			expect(again[i].size.sub(part.size).Magnitude).toBe(0);
		});
	});

	it("puts a signpost on the first terrace", () => {
		expect(parts.some((part) => part.sign !== undefined && part.group === "Terrace1")).toBe(true);
	});

	it("builds whatever terraces the quad has so far", () => {
		const one = quadOne([1.6]);
		const plan = planGrassland(one);
		expect(plan.size()).toBeGreaterThan(0);
		expect(
			allClear(
				plan.filter((part) => part.collide),
				[...one.clearZones, ...extraClearZones(one)],
			),
		).toBe(true);
		expect(planGrassland({ terraces: [], ramps: [], clearZones: [] }).size()).toBe(0);
	});
});
