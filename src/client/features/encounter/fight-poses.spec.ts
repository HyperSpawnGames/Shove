import { describe, expect, it } from "@rbxts/jest-globals";
import { reachDownAngle } from "./fight-poses";

describe("reachDownAngle", () => {
	it("leaves fighters of a size reaching straight ahead", () => {
		expect(reachDownAngle(5.4, 5.4, 6)).toBe(0);
	});

	it("never reaches up to a taller player", () => {
		expect(reachDownAngle(5.4, 8, 6)).toBe(0);
	});

	it("aims a taller giant's shoulders down at the player's", () => {
		// Shoulders 0.8 x 5 = 4 studs higher, 4 studs away: 45 degrees.
		expect(reachDownAngle(10.4, 5.4, 4)).toBeCloseTo(45);
		expect(reachDownAngle(7.4, 5.4, 8)).toBeCloseTo(math.deg(math.atan2(1.6, 8)));
	});

	it("caps the angle for a towering giant up close", () => {
		expect(reachDownAngle(50, 5.4, 2)).toBe(45);
	});
});
