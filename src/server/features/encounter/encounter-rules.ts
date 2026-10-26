/**
 * The shove contest as numbers. The meter runs from 0 (the player is off the
 * left cliff) to 1 (the giant is off the right cliff). Clicks push it right,
 * the giant's resistance pulls it left every second.
 */
export type FightOutcome = "won" | "lost";

/**
 * How the player's Strength compares with the giant's recommendation. The
 * offset softens the low end, so a player with 0 Strength scores a small
 * ratio rather than none.
 */
export function strengthRatio(strength: number, recommended: number, offset: number): number {
	return math.max(strength + offset, 0) / math.max(recommended + offset, 1);
}

/**
 * Meter gained by one accepted shove: the base gain scaled by the strength
 * ratio, capped so a far stronger player wins in one click and never more.
 */
export function shoveGain(ratio: number, baseGain: number, maxGain: number): number {
	return math.min(baseGain * ratio, maxGain);
}

/**
 * Reaching either end decides the fight. Running out of time is a loss: the
 * giant outlasted the player.
 */
export function fightOutcome(meter: number, elapsed: number, maxSeconds: number): FightOutcome | undefined {
	if (meter >= 1) return "won";
	if (meter <= 0 || elapsed >= maxSeconds) return "lost";
	return undefined;
}

/**
 * Seconds a fight lasts for a player clicking steadily at `clicksPerSecond`,
 * or undefined when they can never win. The tuning reference: the specs pin
 * the 10–15 second target with it.
 */
export function expectedFightSeconds(
	clicksPerSecond: number,
	gain: number,
	resistancePerSecond: number,
	startMeter: number,
): number | undefined {
	const netPerSecond = clicksPerSecond * gain - resistancePerSecond;
	if (netPerSecond <= 0) return undefined;
	return (1 - startMeter) / netPerSecond;
}

/** A token bucket of shoves: refills at the cap rate, holds a small burst. */
export interface ShoveBucket {
	tokens: number;
	updatedAt: number;
}

export function fullShoveBucket(now: number, burst: number): ShoveBucket {
	return { tokens: burst, updatedAt: now };
}

/**
 * Spends one shove if the bucket has one. Clicks beyond `perSecond` on
 * average are refused; `burst` absorbs network jitter bunching honest clicks.
 */
export function takeShove(
	bucket: ShoveBucket,
	now: number,
	perSecond: number,
	burst: number,
): [accepted: boolean, bucket: ShoveBucket] {
	const tokens = math.min(burst, bucket.tokens + math.max(now - bucket.updatedAt, 0) * perSecond);
	if (tokens < 1) return [false, { tokens, updatedAt: now }];
	return [true, { tokens: tokens - 1, updatedAt: now }];
}

/**
 * One surge of the giant's push: a wind-up the client shows as a warning,
 * then a short, hard lunge. Times are on the fight's clock.
 */
export interface SurgePlan {
	warnAt: number;
	startsAt: number;
	endsAt: number;
}

export interface SurgeTiming {
	/** Quiet seconds between one surge ending and the next starting, drawn uniformly. */
	minGap: number;
	maxGap: number;
	/** Seconds of warning before the lunge lands. */
	warning: number;
	/** Seconds the lunge pushes. */
	duration: number;
}

/** The next surge after `after`; `roll` in [0, 1) picks the gap. */
export function planSurge(after: number, timing: SurgeTiming, roll: number): SurgePlan {
	const startsAt = after + timing.minGap + (timing.maxGap - timing.minGap) * roll;
	return { warnAt: startsAt - timing.warning, startsAt, endsAt: startsAt + timing.duration };
}

export type SurgeState = "Warn" | "Push";

export function surgeState(plan: SurgePlan, now: number): SurgeState | undefined {
	if (now >= plan.startsAt && now < plan.endsAt) return "Push";
	if (now >= plan.warnAt && now < plan.startsAt) return "Warn";
	return undefined;
}

/**
 * Splits a giant's average push into a steady part and its surges, so that
 * over a fight the two average back to `averagePerSecond`: the tuning of
 * fight length is unchanged, only its rhythm. `surgeShare` of the push comes
 * in surges.
 */
export function splitResistance(
	averagePerSecond: number,
	surgeShare: number,
	timing: SurgeTiming,
): { steadyPerSecond: number; surgePerSecond: number } {
	const meanCycle = (timing.minGap + timing.maxGap) / 2 + timing.duration;
	return {
		steadyPerSecond: averagePerSecond * (1 - surgeShare),
		surgePerSecond: (averagePerSecond * surgeShare * meanCycle) / timing.duration,
	};
}

/**
 * Meter the giant pushes back between `from` and `to`: the steady push for
 * the whole span, plus the surge push for the part of the span inside the
 * lunge. Exact however the frames fall across a surge's edges.
 */
export function resistanceBetween(
	from: number,
	to: number,
	plan: SurgePlan,
	steadyPerSecond: number,
	surgePerSecond: number,
): number {
	const overlap = math.max(0, math.min(to, plan.endsAt) - math.max(from, plan.startsAt));
	return steadyPerSecond * (to - from) + surgePerSecond * overlap;
}
