import { describe, expect, it } from "@rbxts/jest-globals";
import { throwVelocity } from "./throw-arc";

const GRAVITY = 196.2;

describe("throwVelocity", () => {
	it("lands the distance away when the body falls back to its launch height", () => {
		for (const distance of [30, 300]) {
			const velocity = throwVelocity(distance, 35, GRAVITY);
			const flightTime = (2 * velocity.Y) / GRAVITY;
			expect(velocity.X * flightTime).toBeCloseTo(distance, 1);
		}
	});

	it("rises at the launch angle, toward +X, with no sideways drift along Z", () => {
		const velocity = throwVelocity(100, 35, GRAVITY);
		expect(math.deg(math.atan2(velocity.Y, velocity.X))).toBeCloseTo(35, 3);
		expect(velocity.X > 0).toBe(true);
		expect(velocity.Z).toBe(0);
	});
});
