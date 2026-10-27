import type { ClearZone } from "../types";

export type PartShape = "block" | "ball" | "cylinder";

/**
 * One Part of the Grassland as plain data, so placement can be planned and
 * checked without touching the world. A cylinder's axis runs along its X,
 * as in the engine; a ball's diameter is its smallest size component.
 */
export interface PartSpec {
	/** The prop group this part belongs to, which becomes its folder. */
	group: string;
	name: string;
	shape: PartShape;
	size: Vector3;
	cframe: CFrame;
	color: Color3;
	material: Enum.Material;
	collide: boolean;
	/** Text painted on the part's back face, the one that faces the spawn. */
	sign?: string;
	/** Gives the part a faint drift of pollen. */
	pollen?: boolean;
}

/** Studs every keep-clear box is grown by before testing, so props never graze one. */
export const CLEAR_MARGIN = 0.5;

/**
 * Whether `part` reaches into `zone` (grown by CLEAR_MARGIN). Balls are tested
 * exactly; every other shape by its full box, which is never smaller than
 * the part, so a "no" is always safe.
 */
export function overlapsZone(part: PartSpec, zone: ClearZone): boolean {
	const half = zone.size.div(2).add(new Vector3(CLEAR_MARGIN, CLEAR_MARGIN, CLEAR_MARGIN));
	if (part.shape === "ball") {
		const radius = math.min(part.size.X, part.size.Y, part.size.Z) / 2;
		const center = zone.cframe.PointToObjectSpace(part.cframe.Position);
		const closest = new Vector3(
			math.clamp(center.X, -half.X, half.X),
			math.clamp(center.Y, -half.Y, half.Y),
			math.clamp(center.Z, -half.Z, half.Z),
		);
		return center.sub(closest).Magnitude < radius;
	}

	const extent = part.size.div(2);
	let minX = math.huge;
	let minY = math.huge;
	let minZ = math.huge;
	let maxX = -math.huge;
	let maxY = -math.huge;
	let maxZ = -math.huge;
	for (const sx of [-1, 1]) {
		for (const sy of [-1, 1]) {
			for (const sz of [-1, 1]) {
				const corner = part.cframe.PointToWorldSpace(new Vector3(sx * extent.X, sy * extent.Y, sz * extent.Z));
				const p = zone.cframe.PointToObjectSpace(corner);
				minX = math.min(minX, p.X);
				minY = math.min(minY, p.Y);
				minZ = math.min(minZ, p.Z);
				maxX = math.max(maxX, p.X);
				maxY = math.max(maxY, p.Y);
				maxZ = math.max(maxZ, p.Z);
			}
		}
	}
	return minX < half.X && maxX > -half.X && minY < half.Y && maxY > -half.Y && minZ < half.Z && maxZ > -half.Z;
}

/** Whether every part in `parts` stays out of every zone in `zones`. */
export function allClear(parts: readonly PartSpec[], zones: readonly ClearZone[]): boolean {
	return parts.every((part) => zones.every((zone) => !overlapsZone(part, zone)));
}
