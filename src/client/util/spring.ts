/** How a spring moves toward its target. */
export interface SpringTuning {
	/** Angular frequency in radians per second: higher snaps faster. */
	speed: number;
	/** 1 settles without overshoot; below 1 overshoots and wobbles; above 1 creeps. */
	damping: number;
}

/** No step integrates more than this many seconds at once, so a long frame stays stable. */
const MAX_SUBSTEP = 1 / 120;

/**
 * Advances a damped spring by `dt` seconds toward `target`. Returns the new
 * position and velocity. Semi-implicit Euler in short substeps: stable at any
 * frame rate for the speeds a pose uses.
 */
export function stepSpring(
	position: Vector3,
	velocity: Vector3,
	target: Vector3,
	tuning: SpringTuning,
	dt: number,
): [Vector3, Vector3] {
	const { speed, damping } = tuning;
	let remaining = math.max(dt, 0);
	while (remaining > 0) {
		const h = math.min(remaining, MAX_SUBSTEP);
		const acceleration = target
			.sub(position)
			.mul(speed * speed)
			.sub(velocity.mul(2 * damping * speed));
		velocity = velocity.add(acceleration.mul(h));
		position = position.add(velocity.mul(h));
		remaining -= h;
	}
	return [position, velocity];
}
