/**
 * The castle zone as data: every prop is a list of pieces, each one Part to
 * build. Placement is pure, so specs can prove no collidable piece enters a
 * keep-clear box before a single Part exists.
 */

export type PieceShape = "Block" | "Cylinder" | "Ball";

/** One Part of a prop, in world space. */
export interface Piece {
	name: string;
	size: Vector3;
	cframe: CFrame;
	color: Color3;
	material: Enum.Material;
	/** Off for cloth, trims and fire: things a player could never stand on. */
	collidable: boolean;
	/** Block when omitted. A Cylinder's axis is its local X, as on a Part. */
	shape?: PieceShape;
	transparency?: number;
	/** A brazier's bowl: the builder lights it with Fire and a warm PointLight. */
	fire?: boolean;
}

/** An axis-aligned box in world space. */
export interface Box {
	min: Vector3;
	max: Vector3;
}

/** The world-space box around a part of `size` at `cframe`, however it is rotated. */
export function boundsOf(cframe: CFrame, size: Vector3): Box {
	const right = cframe.RightVector;
	const up = cframe.UpVector;
	const look = cframe.LookVector;
	const hx = size.X / 2;
	const hy = size.Y / 2;
	const hz = size.Z / 2;
	const extent = new Vector3(
		math.abs(right.X) * hx + math.abs(up.X) * hy + math.abs(look.X) * hz,
		math.abs(right.Y) * hx + math.abs(up.Y) * hy + math.abs(look.Y) * hz,
		math.abs(right.Z) * hx + math.abs(up.Z) * hy + math.abs(look.Z) * hz,
	);
	const center = cframe.Position;
	return { min: center.sub(extent), max: center.add(extent) };
}

/** Whether two boxes share volume; boxes that only touch do not. */
export function boxesOverlap(a: Box, b: Box): boolean {
	return (
		a.min.X < b.max.X &&
		a.max.X > b.min.X &&
		a.min.Y < b.max.Y &&
		a.max.Y > b.min.Y &&
		a.min.Z < b.max.Z &&
		a.max.Z > b.min.Z
	);
}

/** Distance between two boxes seen from above (0 when their footprints overlap). */
export function planGap(a: Box, b: Box): number {
	const dx = math.max(a.min.X - b.max.X, b.min.X - a.max.X, 0);
	const dz = math.max(a.min.Z - b.max.Z, b.min.Z - a.max.Z, 0);
	return math.sqrt(dx * dx + dz * dz);
}

/**
 * A deterministic generator in [0, 1): Park-Miller, whose products stay
 * within a double's exact integers, so a seed gives the same zone every run.
 */
export function seededRandom(seed: number): () => number {
	let state = math.floor(math.abs(seed)) % 2147483646;
	state += 1;
	return () => {
		state = (state * 16807) % 2147483647;
		return (state - 1) / 2147483646;
	};
}
