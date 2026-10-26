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
