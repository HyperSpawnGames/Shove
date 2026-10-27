import type { RampLayout, TerraceLayout } from "../../world-layout";
import type { ClearZone } from "../types";

/**
 * Box geometry for placing the Chaos zone's props: where the climb must stay
 * open, and how far a box is from it. Every test is conservative: a box is
 * measured by the bounds of its eight corners in the other box's frame, so
 * "clear" here is clear in the world too.
 */

/** Mirrors the staircase's gate wall (GATE_HEIGHT, 1 stud thick on the front edge), with headroom. */
const GATE_KEEP_OUT_HEIGHT = 20;
const GATE_KEEP_OUT_DEPTH = 1;
/** Mirrors the staircase's ramp (RAMP_WIDTH), with headroom above its surface. */
const RAMP_KEEP_OUT_WIDTH = 16;
const RAMP_KEEP_OUT_HEADROOM = 16;

/** The eight corners of a box, in world space. */
export function boxCorners(cframe: CFrame, size: Vector3): Vector3[] {
	const half = size.mul(0.5);
	const corners: Vector3[] = [];
	for (const sx of [-1, 1])
		for (const sy of [-1, 1])
			for (const sz of [-1, 1])
				corners.push(cframe.PointToWorldSpace(new Vector3(sx * half.X, sy * half.Y, sz * half.Z)));
	return corners;
}

/**
 * How far a box (cframe, size) stands clear of `zone`, along the zone's own
 * axes: the widest gap on any axis considered, or zero or less when the two
 * overlap on every one. With `planOnly`, height is ignored, so the gap is the
 * one seen from above.
 */
export function separation(zone: ClearZone, cframe: CFrame, size: Vector3, planOnly: boolean): number {
	const half = zone.size.mul(0.5);
	let minX = math.huge;
	let minY = math.huge;
	let minZ = math.huge;
	let maxX = -math.huge;
	let maxY = -math.huge;
	let maxZ = -math.huge;
	for (const corner of boxCorners(cframe, size)) {
		const p = zone.cframe.PointToObjectSpace(corner);
		minX = math.min(minX, p.X);
		minY = math.min(minY, p.Y);
		minZ = math.min(minZ, p.Z);
		maxX = math.max(maxX, p.X);
		maxY = math.max(maxY, p.Y);
		maxZ = math.max(maxZ, p.Z);
	}
	const gapX = math.max(minX - half.X, -half.X - maxX);
	const gapZ = math.max(minZ - half.Z, -half.Z - maxZ);
	if (planOnly) return math.max(gapX, gapZ);
	const gapY = math.max(minY - half.Y, -half.Y - maxY);
	return math.max(gapX, gapY, gapZ);
}

/** True when a box enters `zone` anywhere in 3D. */
export function overlaps(zone: ClearZone, cframe: CFrame, size: Vector3): boolean {
	return separation(zone, cframe, size, false) <= 0;
}

/** The wall a gate may stand on across a terrace's front edge, from its floor up. */
export function gateKeepOut(layout: TerraceLayout): ClearZone {
	return {
		cframe: new CFrame(0, layout.floorY + GATE_KEEP_OUT_HEIGHT / 2, layout.frontZ - GATE_KEEP_OUT_DEPTH / 2),
		size: new Vector3(layout.width, GATE_KEEP_OUT_HEIGHT, GATE_KEEP_OUT_DEPTH),
	};
}

/** The corridor a ramp climbs through: its full width, from end to end, with headroom over its surface. */
export function rampKeepOut(ramp: RampLayout): ClearZone {
	const bottom = math.min(ramp.from.Y, ramp.to.Y) - 2;
	const top = math.max(ramp.from.Y, ramp.to.Y) + RAMP_KEEP_OUT_HEADROOM;
	const minX = math.min(ramp.from.X, ramp.to.X) - RAMP_KEEP_OUT_WIDTH / 2;
	const maxX = math.max(ramp.from.X, ramp.to.X) + RAMP_KEEP_OUT_WIDTH / 2;
	const minZ = math.min(ramp.from.Z, ramp.to.Z);
	const maxZ = math.max(ramp.from.Z, ramp.to.Z);
	return {
		cframe: new CFrame((minX + maxX) / 2, (bottom + top) / 2, (minZ + maxZ) / 2),
		size: new Vector3(maxX - minX, top - bottom, maxZ - minZ),
	};
}

/** True when a box lies, seen from above, inside `layout`'s top, `inset` studs in from every edge. */
export function withinTerrace(layout: TerraceLayout, cframe: CFrame, size: Vector3, inset: number): boolean {
	const halfWidth = layout.width / 2 - inset;
	for (const corner of boxCorners(cframe, size)) {
		if (math.abs(corner.X) > halfWidth) return false;
		if (corner.Z > layout.frontZ - inset || corner.Z < layout.backZ + inset) return false;
	}
	return true;
}
