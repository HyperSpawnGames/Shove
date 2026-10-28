/**
 * The corners of a lightning bolt from `from` to `to`: the straight line cut
 * into `segments` pieces, each inner corner pushed sideways by up to `jitter`
 * studs, most in the middle and none at the ends, so the bolt leaves and
 * lands exactly where it should. Returns `segments + 1` points.
 */
export function boltPoints(from: Vector3, to: Vector3, segments: number, jitter: number, rng: Random): Vector3[] {
	const along = to.sub(from);
	const direction = along.Magnitude > 1e-6 ? along.Unit : new Vector3(0, 1, 0);
	// Two directions across the bolt, to push its corners in.
	const helper = math.abs(direction.Y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
	const side = direction.Cross(helper).Unit;
	const up = direction.Cross(side).Unit;

	const points = [from];
	for (let i = 1; i < segments; i++) {
		const t = i / segments;
		const reach = jitter * math.sin(math.pi * t);
		const offset = side.mul(rng.NextNumber(-1, 1) * reach).add(up.mul(rng.NextNumber(-1, 1) * reach));
		points.push(from.add(along.mul(t)).add(offset));
	}
	points.push(to);
	return points;
}
