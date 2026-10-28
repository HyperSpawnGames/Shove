import { describe, expect, it } from "@rbxts/jest-globals";
import { tierTuning } from "../../roster/tuning";
import { giantClearZone, laneClearZone } from "../../staircase";
import { giantFootprint, layoutTerraces } from "../../world-layout";
import type { GiantDefinition } from "../../giants";
import { overlapsZone } from "./part-spec";
import { planSpawnMeadow, SPAWN_MEADOW_PART_BUDGET, spawnClearZones } from "./spawn-meadow";

const noob = { ...tierTuning(0), modelId: "Noob", displayName: "Noob" } as GiantDefinition;
const [first] = layoutTerraces([giantFootprint(noob.scale)]);
const keepClear = [giantClearZone(noob, first), laneClearZone(first)];
const plan = planSpawnMeadow(first, keepClear);

describe("planSpawnMeadow", () => {
	it("dresses the spawn with props", () => {
		expect(plan.size()).toBeGreaterThan(40);
	});

	it("stays within its part budget", () => {
		expect(plan.size()).toBeLessThanOrEqual(SPAWN_MEADOW_PART_BUDGET);
	});

	it("keeps every solid part out of the spawn, the walk to the climb and the giant's space", () => {
		const zones = [...keepClear, ...spawnClearZones(first)];
		for (const part of plan) {
			if (!part.collide) continue;
			for (const zone of zones) expect(overlapsZone(part, zone)).toBe(false);
		}
	});

	it("stays in front of the first terrace", () => {
		for (const part of plan) expect(part.cframe.Position.Z).toBeGreaterThan(first.frontZ);
	});

	it("is the same every run", () => {
		const again = planSpawnMeadow(first, keepClear);
		expect(again.size()).toBe(plan.size());
		for (let i = 0; i < plan.size(); i++) expect(again[i].cframe).toEqual(plan[i].cframe);
	});
});
