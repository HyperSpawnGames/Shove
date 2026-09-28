/**
 * The launch velocity, toward +X and up, that carries a body `distance`
 * studs sideways by the time it falls back to its launch height, rising at
 * `angleDegrees` above the horizontal.
 *
 * Aimed rather than a fixed speed in giant heights per second: gravity does
 * not grow with the giants, so a speed proportional to size lands short of
 * the cliff edge at every size on the roster.
 */
export function throwVelocity(distance: number, angleDegrees: number, gravity: number): Vector3 {
	const angle = math.rad(angleDegrees);
	const speed = math.sqrt((gravity * distance) / math.sin(2 * angle));
	return new Vector3(speed * math.cos(angle), speed * math.sin(angle), 0);
}
