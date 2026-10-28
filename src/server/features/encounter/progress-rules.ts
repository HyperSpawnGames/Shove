/**
 * Arena access as one number: how many giants of the staircase the player
 * has beaten at least once. Giant i (0-based) is open once every giant below
 * it is cleared, and its first victory opens giant i + 1.
 */
export function canChallenge(giantIndex: number, highestCleared: number): boolean {
	return giantIndex >= 0 && giantIndex <= highestCleared;
}

/** Progress after beating giant `giantIndex`. Replaying a cleared giant changes nothing. */
export function clearedAfterWin(giantIndex: number, highestCleared: number): number {
	return math.max(highestCleared, giantIndex + 1);
}

/**
 * Walk speed after finishing `quadsFinished` of `quadsToFinish` quads (a quad
 * is finished by reaching the empty terrace after it): an even step for each,
 * from `baseSpeed` at none to `maxSpeed` once the last empty terrace is reached.
 */
export function walkSpeedFor(
	quadsFinished: number,
	quadsToFinish: number,
	baseSpeed: number,
	maxSpeed: number,
): number {
	if (quadsToFinish <= 0) return baseSpeed;
	const share = math.clamp(quadsFinished / quadsToFinish, 0, 1);
	return baseSpeed + (maxSpeed - baseSpeed) * share;
}
