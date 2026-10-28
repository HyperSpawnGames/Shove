import { describe, expect, it } from "@rbxts/jest-globals";
import { canChallenge, clearedAfterWin, walkSpeedFor } from "./progress-rules";

describe("canChallenge", () => {
	it("opens the first giant to a new player", () => {
		expect(canChallenge(0, 0)).toBe(true);
	});

	it("keeps the next giant shut until the one below is cleared", () => {
		expect(canChallenge(1, 0)).toBe(false);
		expect(canChallenge(1, 1)).toBe(true);
	});

	it("keeps cleared giants open for replays", () => {
		expect(canChallenge(0, 3)).toBe(true);
	});

	it("refuses a negative index", () => {
		expect(canChallenge(-1, 3)).toBe(false);
	});
});

describe("clearedAfterWin", () => {
	it("opens the next giant on a first win", () => {
		expect(clearedAfterWin(0, 0)).toBe(1);
	});

	it("leaves progress alone on a replay", () => {
		expect(clearedAfterWin(0, 2)).toBe(2);
	});
});

describe("walkSpeedFor", () => {
	it("starts at the base speed and steps evenly to the max", () => {
		expect(walkSpeedFor(0, 7, 16, 100)).toBe(16);
		expect(walkSpeedFor(1, 7, 16, 100)).toBe(28);
		expect(walkSpeedFor(7, 7, 16, 100)).toBe(100);
	});

	it("never goes past the max or below the base", () => {
		expect(walkSpeedFor(9, 7, 16, 100)).toBe(100);
		expect(walkSpeedFor(-1, 7, 16, 100)).toBe(16);
	});

	it("stays at the base with no quads to finish", () => {
		expect(walkSpeedFor(0, 0, 16, 100)).toBe(16);
	});
});
