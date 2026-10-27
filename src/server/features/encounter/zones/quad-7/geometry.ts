/** A world-aligned box: the bounds every placement check in this zone works in. */
export interface Box {
	min: Vector3;
	max: Vector3;
}

/** The world-aligned bounds of a part of `size` at `cframe`, however it is rotated. */
export function boxOf(cframe: CFrame, size: Vector3): Box {
	const half = size.div(2);
	const x = cframe.XVector;
	const y = cframe.YVector;
	const z = cframe.ZVector;
	const extent = new Vector3(
		math.abs(x.X) * half.X + math.abs(y.X) * half.Y + math.abs(z.X) * half.Z,
		math.abs(x.Y) * half.X + math.abs(y.Y) * half.Y + math.abs(z.Y) * half.Z,
		math.abs(x.Z) * half.X + math.abs(y.Z) * half.Y + math.abs(z.Z) * half.Z,
	);
	return { min: cframe.Position.sub(extent), max: cframe.Position.add(extent) };
}

/** A box from two opposite corners, in any order. */
export function boxBetween(a: Vector3, b: Vector3): Box {
	return { min: a.Min(b), max: a.Max(b) };
}

/** Whether two boxes share any volume (touching faces do not count). */
export function boxesOverlap(a: Box, b: Box): boolean {
	return (
		a.min.X < b.max.X &&
		b.min.X < a.max.X &&
		a.min.Y < b.max.Y &&
		b.min.Y < a.max.Y &&
		a.min.Z < b.max.Z &&
		b.min.Z < a.max.Z
	);
}

/** Distance between two boxes seen from above: 0 when their footprints touch or overlap. */
export function planGap(a: Box, b: Box): number {
	const dx = math.max(0, a.min.X - b.max.X, b.min.X - a.max.X);
	const dz = math.max(0, a.min.Z - b.max.Z, b.min.Z - a.max.Z);
	return math.sqrt(dx * dx + dz * dz);
}
