import { describe, expect, it } from "@rbxts/jest-globals";
import { boxesOverlap, boxOf, gateWall, planGap, rampCorridor } from "./geometry";

function box(min: Vector3, max: Vector3) {
	return { min, max };
}

describe("boxOf", () => {
	it("is the part itself when unrotated", () => {
		const result = boxOf(new CFrame(10, 5, -3), new Vector3(4, 2, 6));
		expect(result.min.FuzzyEq(new Vector3(8, 4, -6), 1e-4)).toBe(true);
		expect(result.max.FuzzyEq(new Vector3(12, 6, 0), 1e-4)).toBe(true);
	});

	it("swaps axes for a part turned upright", () => {
		const result = boxOf(new CFrame(0, 0, 0).mul(CFrame.Angles(0, 0, math.pi / 2)), new Vector3(10, 2, 2));
		expect(result.max.Y).toBeCloseTo(5);
		expect(result.max.X).toBeCloseTo(1);
	});

	it("grows to hold a part turned 45 degrees", () => {
		const result = boxOf(CFrame.Angles(0, math.pi / 4, 0), new Vector3(2, 2, 2));
		expect(result.max.X).toBeCloseTo(math.sqrt(2));
	});
});

describe("boxesOverlap and planGap", () => {
	const a = box(new Vector3(0, 0, 0), new Vector3(4, 4, 4));

	it("finds shared volume, not touching faces", () => {
		expect(boxesOverlap(a, box(new Vector3(3, 3, 3), new Vector3(5, 5, 5)))).toBe(true);
		expect(boxesOverlap(a, box(new Vector3(4, 0, 0), new Vector3(6, 4, 4)))).toBe(false);
	});

	it("ignores height in plan view", () => {
		expect(planGap(a, box(new Vector3(0, 100, 0), new Vector3(4, 104, 4)))).toBe(0);
		expect(planGap(a, box(new Vector3(7, 0, 0), new Vector3(9, 4, 4)))).toBe(3);
	});

	it("measures corner to corner diagonally", () => {
		expect(planGap(a, box(new Vector3(7, 0, 8), new Vector3(9, 4, 9)))).toBeCloseTo(5);
	});
});

describe("keep-clear helpers", () => {
	const raised = {
		floorY: 40,
		frontZ: -100,
		backZ: -200,
		width: 120,
		giantPosition: new Vector3(0, 40, -155),
	};

	it("puts a gate wall on a raised terrace's front edge only", () => {
		const wall = gateWall(raised);
		expect(wall?.max.Z).toBe(-100);
		expect(wall?.max.X).toBe(60);
		expect(gateWall({ ...raised, floorY: 0 })).toBeUndefined();
	});

	it("covers the whole ramp with headroom", () => {
		const corridor = rampCorridor({ from: new Vector3(0, 20, -60), to: new Vector3(0, 40, -100) });
		expect(corridor.min.Z).toBe(-100);
		expect(corridor.max.Z).toBe(-60);
		expect(corridor.max.Y).toBeGreaterThan(40);
		expect(corridor.max.X).toBeGreaterThan(8);
	});
});
