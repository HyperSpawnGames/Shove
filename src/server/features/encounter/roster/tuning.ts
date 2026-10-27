/**
 * Starting values for the giant at `index` on the staircase (0 is the Noob),
 * for a quad's roster to use or adjust with a reason. Size grows 5% per
 * giant from Baron's 3x; recommended Strength 2.6x and payout 2.4x per giant,
 * so each new opponent asks for clearly more training and pays for it.
 */
export interface TierTuning {
	scale: number;
	recommendedStrength: number;
	winsPayout: number;
	resistancePerSecond: number;
}

/** The first quad, hand-tuned before these curves existed; the curves continue from it. */
const FIRST_QUAD: TierTuning[] = [
	{ scale: 1.6, recommendedStrength: 20, winsPayout: 5, resistancePerSecond: 0.04 },
	{ scale: 2, recommendedStrength: 120, winsPayout: 20, resistancePerSecond: 0.04 },
	{ scale: 2.5, recommendedStrength: 500, winsPayout: 75, resistancePerSecond: 0.04 },
	{ scale: 3, recommendedStrength: 1300, winsPayout: 180, resistancePerSecond: 0.04 },
];

export const SCALE_GROWTH = 1.05;
export const STRENGTH_GROWTH = 2.6;
export const PAYOUT_GROWTH = 2.4;

/** Rounds to two significant figures, so tuned numbers read cleanly on signs. */
function round2(value: number): number {
	if (value <= 0) return 0;
	const magnitude = 10 ** (math.floor(math.log10(value)) - 1);
	return math.floor(value / magnitude + 0.5) * magnitude;
}

export function tierTuning(index: number): TierTuning {
	if (index < FIRST_QUAD.size()) return FIRST_QUAD[index];
	const last = FIRST_QUAD[FIRST_QUAD.size() - 1];
	const steps = index - (FIRST_QUAD.size() - 1);
	return {
		scale: math.floor(last.scale * SCALE_GROWTH ** steps * 100 + 0.5) / 100,
		recommendedStrength: round2(last.recommendedStrength * STRENGTH_GROWTH ** steps),
		winsPayout: round2(last.winsPayout * PAYOUT_GROWTH ** steps),
		resistancePerSecond: last.resistancePerSecond,
	};
}
