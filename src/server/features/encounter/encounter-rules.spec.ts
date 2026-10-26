import { describe, expect, it } from "@rbxts/jest-globals";
import {
	BASE_SHOVE_GAIN,
	MAX_SHOVE_GAIN,
	MAX_SHOVES_PER_SECOND,
	START_METER,
	STRENGTH_RATIO_OFFSET,
} from "./encounter-config";
import {
	applyResistance,
	expectedFightSeconds,
	fightOutcome,
	fullShoveBucket,
	shoveGain,
	strengthRatio,
	takeShove,
} from "./encounter-rules";

describe("strengthRatio", () => {
	it("is 1 at the recommendation", () => {
		expect(strengthRatio(20, 20, 10)).toBe(1);
	});

	it("stays above 0 for a player with no Strength", () => {
		expect(strengthRatio(0, 20, 10)).toBeGreaterThan(0);
	});
});

describe("shoveGain", () => {
	it("scales with the ratio", () => {
		expect(shoveGain(2, 0.01, 0.5)).toBe(0.02);
	});

	it("is capped", () => {
		expect(shoveGain(1000, 0.01, 0.5)).toBe(0.5);
	});
});

describe("applyResistance", () => {
	it("moves the meter left over time", () => {
		expect(applyResistance(0.5, 0.04, 2)).toBeCloseTo(0.42);
	});
});

describe("fightOutcome", () => {
	it("is undecided mid-meter", () => {
		expect(fightOutcome(0.5, 5, 30)).toBe(undefined);
	});

	it("is won at the right end", () => {
		expect(fightOutcome(1, 5, 30)).toBe("won");
	});

	it("is lost at the left end", () => {
		expect(fightOutcome(0, 5, 30)).toBe("lost");
	});

	it("is lost when time runs out", () => {
		expect(fightOutcome(0.9, 30, 30)).toBe("lost");
	});
});

describe("takeShove", () => {
	it("accepts a burst, then refuses", () => {
		let bucket = fullShoveBucket(0, 3);
		let accepted = 0;
		for (let i = 0; i < 10; i++) {
			const [ok, refilled] = takeShove(bucket, 0, 8, 3);
			bucket = refilled;
			if (ok) accepted += 1;
		}
		expect(accepted).toBe(3);
	});

	it("never accepts more than the cap over a second of spam", () => {
		let bucket = fullShoveBucket(0, 3);
		let accepted = 0;
		for (let i = 0; i <= 100; i++) {
			const [ok, refilled] = takeShove(bucket, i / 100, 8, 3);
			bucket = refilled;
			if (ok) accepted += 1;
		}
		expect(accepted).toBeLessThanOrEqual(8 + 3);
	});

	it("refills after a pause", () => {
		const [, drained] = takeShove({ tokens: 0.5, updatedAt: 0 }, 0, 8, 3);
		const [ok] = takeShove(drained, 1, 8, 3);
		expect(ok).toBe(true);
	});
});

// The tuning as shipped: a first fight lasts 10–15 s, and Strength shortens it.
describe("fight length", () => {
	const RESISTANCE = 0.04;
	const STEADY_CLICKS = 6;
	const secondsAt = (strength: number, recommended: number, clicks: number) =>
		expectedFightSeconds(
			clicks,
			shoveGain(strengthRatio(strength, recommended, STRENGTH_RATIO_OFFSET), BASE_SHOVE_GAIN, MAX_SHOVE_GAIN),
			RESISTANCE,
			START_METER,
		);

	it("takes 10 to 15 seconds at the recommendation, clicking steadily", () => {
		const seconds = secondsAt(20, 20, STEADY_CLICKS)!;
		expect(seconds).toBeGreaterThanOrEqual(10);
		expect(seconds).toBeLessThanOrEqual(15);
	});

	it("is shorter for a stronger player", () => {
		expect(secondsAt(60, 20, STEADY_CLICKS)!).toBeLessThan(secondsAt(20, 20, STEADY_CLICKS)! / 2);
	});

	it("is one click for a player far above the recommendation", () => {
		const gain = shoveGain(strengthRatio(10000, 20, STRENGTH_RATIO_OFFSET), BASE_SHOVE_GAIN, MAX_SHOVE_GAIN);
		expect(START_METER + gain).toBeGreaterThanOrEqual(1);
	});

	it("cannot be won with no Strength, even at the click cap", () => {
		expect(secondsAt(0, 20, MAX_SHOVES_PER_SECOND)).toBe(undefined);
	});
});
