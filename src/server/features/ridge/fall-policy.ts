/** Body heights below the surface at which a falling body is caught. */
export const FALL_DEPTH = 3;

/**
 * True when a body has fallen off the ridge: its root is more than
 * FALL_DEPTH body heights below the surface of the terrace under it, or low
 * enough that it is standing on the valley floor (which a large body reaches
 * before it has fallen that far).
 */
export function hasFallen(rootY: number, surfaceY: number, valleyY: number, bodyHeight: number): boolean {
	return rootY < math.max(valleyY + bodyHeight, surfaceY - FALL_DEPTH * bodyHeight);
}
