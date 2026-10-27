import { describe, expect, it } from "@rbxts/jest-globals";
import { boxBetween, boxesOverlap, boxOf, planGap } from "./geometry";

const EPSILON = 1e-6;

describe("boxOf", () => {
	it("matches the part for an unrotated part", () => {
		const box = boxOf(new CFrame(1, 2, 3), new Vector3(2, 4, 6));
		expect(box.min.sub(new Vector3(0, 0, 0)).Magnitude).toBeLessThan(EPSILON);
		expect(box.max.sub(new Vector3(2, 4, 6)).Magnitude).toBeLessThan(EPSILON);
	});

	it("grows to hold a part turned 45 degrees", () => {
		const box = boxOf(new CFrame(0, 0, 0).mul(CFrame.Angles(0, math.pi / 4, 0)), new Vector3(2, 2, 2));
		expect(box.max.X).toBeCloseTo(math.sqrt(2));
		expect(box.max.Y).toBeCloseTo(1);
	});

	it("swaps axes for an upright cylinder", () => {
		const box = boxOf(new CFrame(0, 5, 0).mul(CFrame.Angles(0, 0, math.pi / 2)), new Vector3(10, 2, 2));
		expect(box.min.Y).toBeCloseTo(0);
		expect(box.max.Y).toBeCloseTo(10);
		expect(box.max.X).toBeCloseTo(1);
	});
});

describe("boxesOverlap", () => {
	const a = boxBetween(new Vector3(0, 0, 0), new Vector3(2, 2, 2));

	it("finds shared volume", () => {
		expect(boxesOverlap(a, boxBetween(new Vector3(1, 1, 1), new Vector3(3, 3, 3)))).toBe(true);
	});

	it("ignores boxes that only touch, or are stacked", () => {
		expect(boxesOverlap(a, boxBetween(new Vector3(2, 0, 0), new Vector3(4, 2, 2)))).toBe(false);
		expect(boxesOverlap(a, boxBetween(new Vector3(0, 3, 0), new Vector3(2, 5, 2)))).toBe(false);
	});
});

describe("planGap", () => {
	const a = boxBetween(new Vector3(0, 0, 0), new Vector3(2, 2, 2));

	it("is zero for overlapping footprints, at any height", () => {
		expect(planGap(a, boxBetween(new Vector3(1, 50, 1), new Vector3(3, 60, 3)))).toBe(0);
	});

	it("measures straight across and corner to corner", () => {
		expect(planGap(a, boxBetween(new Vector3(5, 0, 0), new Vector3(6, 1, 1)))).toBeCloseTo(3);
		expect(planGap(a, boxBetween(new Vector3(5, 0, 6), new Vector3(6, 1, 7)))).toBeCloseTo(5);
	});
});
