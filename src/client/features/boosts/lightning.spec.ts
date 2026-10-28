import { describe, expect, it } from "@rbxts/jest-globals";
import { boltPoints } from "./lightning";

describe("boltPoints", () => {
	const from = new Vector3(1, 2, 3);
	const to = new Vector3(1, 2, 9);

	it("starts and ends exactly at the two ends, with a corner per segment", () => {
		const points = boltPoints(from, to, 5, 0.5, new Random(1));
		expect(points.size()).toBe(6);
		expect(points[0]).toEqual(from);
		expect(points[5]).toEqual(to);
	});

	it("keeps every corner within the jitter of the straight line", () => {
		const points = boltPoints(from, to, 6, 0.4, new Random(7));
		for (const point of points) {
			// The line runs along Z, so the sideways push is all in X and Y.
			const sideways = new Vector2(point.X - from.X, point.Y - from.Y).Magnitude;
			expect(sideways).toBeLessThanOrEqual(0.4 * math.sqrt(2) + 1e-6);
			expect(point.Z >= from.Z - 1e-6 && point.Z <= to.Z + 1e-6).toBe(true);
		}
	});

	it("is straight without jitter, and copes with a vertical bolt", () => {
		const straight = boltPoints(from, to, 4, 0, new Random(3));
		for (const point of straight) expect(new Vector2(point.X - 1, point.Y - 2).Magnitude).toBeLessThan(1e-6);
		const vertical = boltPoints(Vector3.zero, new Vector3(0, 5, 0), 4, 0.3, new Random(3));
		expect(vertical.size()).toBe(5);
		for (const point of vertical) expect(point.X === point.X && point.Z === point.Z).toBe(true);
	});
});
