import { describe, expect, it } from "@rbxts/jest-globals";
import { canChallenge, clearedAfterWin } from "./progress-rules";

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
