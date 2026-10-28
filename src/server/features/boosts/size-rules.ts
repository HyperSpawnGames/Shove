import { SIZE_CAP_SHARE } from "shared/features/boosts/boost-catalog";

/**
 * The largest scale a player may buy: SIZE_CAP_SHARE of the first giant they
 * have not beaten, `giantScales[highestCleared]`. Once every giant is beaten
 * the last one sets it. At least 1, so a player is never asked to shrink.
 */
export function sizeCap(highestCleared: number, giantScales: readonly number[]): number {
	if (giantScales.size() === 0) return 1;
	const nextGiant = giantScales[math.clamp(highestCleared, 0, giantScales.size() - 1)];
	return math.max(1, nextGiant * SIZE_CAP_SHARE);
}
