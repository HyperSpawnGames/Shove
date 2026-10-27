import type { ClearZone } from "../types";

/** An extra the builder attaches to a part: a lit flame, or drifting sand. */
export type PartEffect = "flame" | "sandDrift";

/**
 * One Part of the desert, as data: the planner decides every part up front so
 * specs can check the whole zone before anything is built.
 */
export interface PartSpec {
	name: string;
	size: Vector3;
	cframe: CFrame;
	color: Color3;
	material: Enum.Material;
	/** Block when omitted. A cylinder's axis is its X. */
	shape?: Enum.PartType;
	collides: boolean;
	transparency?: number;
	effect?: PartEffect;
}

/** An axis-aligned box in world space. */
export interface Bounds {
	min: Vector3;
	max: Vector3;
}

/** The world-aligned box around a (possibly rotated) box of `size` at `cframe`. */
export function boxBounds(cframe: CFrame, size: Vector3): Bounds {
	const right = cframe.RightVector;
	const up = cframe.UpVector;
	const look = cframe.LookVector;
	const half = size.div(2);
	const extent = new Vector3(
		math.abs(right.X) * half.X + math.abs(up.X) * half.Y + math.abs(look.X) * half.Z,
		math.abs(right.Y) * half.X + math.abs(up.Y) * half.Y + math.abs(look.Y) * half.Z,
		math.abs(right.Z) * half.X + math.abs(up.Z) * half.Y + math.abs(look.Z) * half.Z,
	);
	const center = cframe.Position;
	return { min: center.sub(extent), max: center.add(extent) };
}

export function partBounds(part: PartSpec): Bounds {
	return boxBounds(part.cframe, part.size);
}

/** Whether two boxes share volume once `a` is grown by `margin` on every side; touching faces don't count. */
export function boundsOverlap(a: Bounds, b: Bounds, margin = 0): boolean {
	return (
		a.min.X - margin < b.max.X &&
		a.max.X + margin > b.min.X &&
		a.min.Y - margin < b.max.Y &&
		a.max.Y + margin > b.min.Y &&
		a.min.Z - margin < b.max.Z &&
		a.max.Z + margin > b.min.Z
	);
}

/** Whether a part's box enters any keep-clear box (grown by `margin`), collidable or not. */
export function entersClearZone(part: PartSpec, zones: readonly ClearZone[], margin = 0): boolean {
	const bounds = partBounds(part);
	return zones.some((zone) => boundsOverlap(bounds, boxBounds(zone.cframe, zone.size), margin));
}

/** Whether a collidable part enters any keep-clear box (grown by `margin`). Non-collidable parts never do. */
export function blocksClearZone(part: PartSpec, zones: readonly ClearZone[], margin = 0): boolean {
	return part.collides && entersClearZone(part, zones, margin);
}
