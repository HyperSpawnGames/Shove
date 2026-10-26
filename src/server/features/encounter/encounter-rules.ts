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

/** The meter after the giant has pushed back for `dt` seconds. */
export function applyResistance(meter: number, resistancePerSecond: number, dt: number): number {
	return meter - resistancePerSecond * dt;
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
