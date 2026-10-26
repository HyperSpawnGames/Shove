import { describe, expect, it } from "@rbxts/jest-globals";
import { canStartTraining, hasLeftTrainingSpot, strengthPerRep } from "./training-rules";

describe("strengthPerRep", () => {
	it("multiplies arm strength by the pet multiplier", () => {
		expect(strengthPerRep(10, 3)).toBe(30);
	});

	it("is the arm strength with no pet bonus", () => {
		expect(strengthPerRep(1, 1)).toBe(1);
	});
});

describe("canStartTraining", () => {
	const ready = { training: false, alive: true, onGround: true };

	it("allows a living player on the ground", () => {
		expect(canStartTraining(ready)).toBe(true);
	});

	it("refuses a player already training", () => {
		expect(canStartTraining({ ...ready, training: true })).toBe(false);
	});

	it("refuses a dead player", () => {
		expect(canStartTraining({ ...ready, alive: false })).toBe(false);
	});

	it("refuses a player in the air", () => {
		expect(canStartTraining({ ...ready, onGround: false })).toBe(false);
	});
});

describe("hasLeftTrainingSpot", () => {
	const origin = new Vector3(0, 5, 0);

	it("stays put inside the tolerance", () => {
		expect(hasLeftTrainingSpot(origin, new Vector3(2, 5, 2), 3)).toBe(false);
	});

	it("leaves once the horizontal distance passes the tolerance", () => {
		expect(hasLeftTrainingSpot(origin, new Vector3(3, 5, 1), 3)).toBe(true);
	});

	it("ignores vertical movement", () => {
		expect(hasLeftTrainingSpot(origin, new Vector3(0, 50, 0), 3)).toBe(false);
	});
});
