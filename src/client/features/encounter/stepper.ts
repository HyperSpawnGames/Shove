/** Moves `value` toward `target` by at most `step`. */
export function approach(value: number, target: number, step: number): number {
	return value < target ? math.min(value + step, target) : math.max(value - step, target);
}

/**
 * Turns a fighter's movement along the shove axis into a stepping cycle, so
 * its feet keep pace with its body instead of sliding. The phase advances by
 * half a cycle per stride travelled, forward or back, measured along the
 * direction the fighter faces; feed it to stepPose.
 */
export class Stepper {
	public phase = 0;
	/** 0..1: how much stepping shows, from the fighter's speed. */
	public amount = 0;
	/** 0..1: how hard the fighter is being driven backward, for a stumble. */
	public backward = 0;
	/** Footfalls since the last call to takeFootfalls(). */
	private footfalls = 0;
	private last?: Vector3;

	/**
	 * @param stride Studs per step.
	 * @param fullSpeed Studs per second at which the steps show in full.
	 */
	constructor(
		private readonly stride: number,
		private readonly fullSpeed: number,
	) {}

	/** `facing` is the fighter's forward direction along the axis. */
	public update(position: Vector3, facing: Vector3, dt: number): void {
		const moved = this.last === undefined ? 0 : position.sub(this.last).Dot(facing);
		this.last = position;

		const before = math.floor(this.phase / math.pi);
		this.phase += (moved / this.stride) * math.pi;
		if (math.floor(this.phase / math.pi) !== before) this.footfalls += 1;

		const speed = moved / math.max(dt, 1 / 240);
		this.amount = approach(this.amount, math.clamp(math.abs(speed) / this.fullSpeed, 0, 1), dt * 8);
		this.backward = approach(this.backward, math.clamp(-speed / (this.fullSpeed * 2.5), 0, 1), dt * 6);
	}

	/** Footfalls landed since the last call, then resets the count. */
	public takeFootfalls(): number {
		const count = this.footfalls;
		this.footfalls = 0;
		return count;
	}
}
