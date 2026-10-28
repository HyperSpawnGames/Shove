import { describe, expect, it } from "@rbxts/jest-globals";
import { GIANTS } from "server/features/encounter/giants";
import { SIZES } from "shared/features/boosts/boost-catalog";
import { sizeCap } from "./size-rules";

describe("sizeCap", () => {
	const scales = [1.6, 2, 2.5, 3];

	it("is three quarters of the first giant not yet beaten", () => {
		expect(sizeCap(0, scales)).toBeCloseTo(1.2);
		expect(sizeCap(2, scales)).toBeCloseTo(1.875);
	});

	it("stays at the last giant's once every giant is beaten", () => {
		expect(sizeCap(4, scales)).toBeCloseTo(2.25);
		expect(sizeCap(99, scales)).toBeCloseTo(2.25);
	});

	it("never asks a player to shrink", () => {
		expect(sizeCap(0, [1])).toBe(1);
		expect(sizeCap(0, [])).toBe(1);
	});

	it("lets every size on the ladder be bought somewhere on the staircase", () => {
		const giantScales = GIANTS.map((giant) => giant.scale);
		const finalCap = sizeCap(giantScales.size(), giantScales);
		for (const size of SIZES) expect(size.scale).toBeLessThanOrEqual(finalCap);
	});
});
