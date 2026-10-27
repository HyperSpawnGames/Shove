import { describe, expect, it } from "@rbxts/jest-globals";
import {
	BASE_SHOVE_GAIN,
	MAX_SHOVE_GAIN,
	MAX_SHOVES_PER_SECOND,
	START_METER,
	STRENGTH_RATIO_OFFSET,
	SURGE_SHARE,
	SURGE_TIMING,
} from "./encounter-config";
import {
	expectedFightSeconds,
	fightOutcome,
	fullShoveBucket,
	planSurge,
	resistanceBetween,
	splitResistance,
	surgeState,
	shoveGain,
	strengthRatio,
	styledSurge,
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

describe("surges", () => {
	const timing = { minGap: 2, maxGap: 4, warning: 0.5, duration: 0.5 };

	it("warns before it pushes", () => {
		const plan = planSurge(10, timing, 0);
		expect(surgeState(plan, 11.6)).toBe("Warn");
		expect(surgeState(plan, 12.2)).toBe("Push");
		expect(surgeState(plan, 12.6)).toBe(undefined);
		expect(surgeState(plan, 11)).toBe(undefined);
	});

	it("draws the gap from the roll", () => {
		expect(planSurge(0, timing, 0).startsAt).toBe(2);
		expect(planSurge(0, timing, 0.5).startsAt).toBe(3);
	});

	it("pushes harder in a surge than steadily", () => {
		const { steadyPerSecond, surgePerSecond } = splitResistance(0.04, 0.75, timing);
		expect(surgePerSecond).toBeGreaterThan(steadyPerSecond * 10);
	});

	it("counts only the part of a frame inside the lunge as surge", () => {
		const plan = planSurge(0, timing, 0); // lunge 2.0 to 2.5
		expect(resistanceBetween(1.9, 2.1, plan, 1, 10)).toBeCloseTo(0.2 + 1);
		expect(resistanceBetween(2.4, 2.6, plan, 1, 10)).toBeCloseTo(0.2 + 1);
		expect(resistanceBetween(3, 3.5, plan, 1, 10)).toBeCloseTo(0.5);
	});

	it("averages back to the giant's push over a fight", () => {
		const average = 0.04;
		const { steadyPerSecond, surgePerSecond } = splitResistance(average, SURGE_SHARE, SURGE_TIMING);
		let total = 0;
		let clock = 0;
		const rolls = [0.1, 0.9, 0.3, 0.7, 0.5];
		for (let i = 0; i < 200; i++) {
			const plan = planSurge(clock, SURGE_TIMING, rolls[i % rolls.size()]);
			total += resistanceBetween(clock, plan.endsAt, plan, steadyPerSecond, surgePerSecond);
			clock = plan.endsAt;
		}
		expect(total / clock).toBeCloseTo(average, 3);
	});

	it("lands each lunge as a visible chunk of the bar", () => {
		const { surgePerSecond } = splitResistance(0.04, SURGE_SHARE, SURGE_TIMING);
		expect(surgePerSecond * SURGE_TIMING.duration).toBeGreaterThanOrEqual(0.06);
	});
});

describe("styledSurge", () => {
	const timing = { minGap: 2, maxGap: 4, warning: 0.5, duration: 0.5 };

	it("keeps the defaults with no overrides", () => {
		const styled = styledSurge(timing, 0.75);
		expect(styled.timing.maxGap).toBe(4);
		expect(styled.share).toBe(0.75);
	});

	it("applies overrides field by field", () => {
		const styled = styledSurge(timing, 0.75, { warning: 0.3, share: 0.9 });
		expect(styled.timing.warning).toBe(0.3);
		expect(styled.timing.minGap).toBe(2);
		expect(styled.share).toBe(0.9);
	});

	it("never lets the gap range invert or the share leave 0..1", () => {
		const styled = styledSurge(timing, 0.75, { minGap: 6, share: 3 });
		expect(styled.timing.maxGap).toBeGreaterThanOrEqual(styled.timing.minGap);
		expect(styled.share).toBe(1);
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
