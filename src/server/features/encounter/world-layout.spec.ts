import { describe, expect, it } from "@rbxts/jest-globals";
import { RAMP_RUN, rampLayout, terraceLayout } from "./world-layout";

describe("terraceLayout", () => {
	it("puts the first terrace on the ground", () => {
		expect(terraceLayout(0).floorY).toBe(0);
	});

	it("climbs and widens with every tier", () => {
		for (let tier = 1; tier < 6; tier++) {
			expect(terraceLayout(tier).floorY).toBeGreaterThan(terraceLayout(tier - 1).floorY);
			expect(terraceLayout(tier).width).toBeGreaterThan(terraceLayout(tier - 1).width);
		}
	});

	it("leaves exactly one ramp run between consecutive terraces", () => {
		for (let tier = 1; tier < 6; tier++) {
			expect(terraceLayout(tier - 1).backZ - terraceLayout(tier).frontZ).toBe(RAMP_RUN);
		}
	});

	it("stands each giant on its own terrace", () => {
		for (let tier = 0; tier < 6; tier++) {
			const layout = terraceLayout(tier);
			expect(layout.giantPosition.Z < layout.frontZ && layout.giantPosition.Z > layout.backZ).toBe(true);
		}
	});
});

describe("rampLayout", () => {
	it("has no ramp to the ground", () => {
		expect(rampLayout(0)).toBe(undefined);
	});

	it("joins the lower back edge to the upper front edge", () => {
		const ramp = rampLayout(2)!;
		expect(ramp.from.Y).toBe(terraceLayout(1).floorY);
		expect(ramp.from.Z).toBe(terraceLayout(1).backZ);
		expect(ramp.to.Y).toBe(terraceLayout(2).floorY);
		expect(ramp.to.Z).toBe(terraceLayout(2).frontZ);
	});

	it("stays walkable: under 35 degrees", () => {
		const ramp = rampLayout(1)!;
		const slope = math.deg(math.atan2(ramp.to.Y - ramp.from.Y, ramp.from.Z - ramp.to.Z));
		expect(slope).toBeLessThan(35);
	});
});
