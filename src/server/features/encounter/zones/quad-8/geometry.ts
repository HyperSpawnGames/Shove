import type { RampLayout, TerraceLayout } from "../../world-layout";
import type { ClearZone } from "../types";

/** An axis-aligned box in world space. */
export interface Box {
	min: Vector3;
	max: Vector3;
}

/** Mirrors staircase.ts: the ramp's width and the gate wall's height. */
const RAMP_WIDTH = 16;
const GATE_HEIGHT = 14;
/** Extra room kept around a ramp, sideways and overhead. */
const RAMP_MARGIN = 1;
const RAMP_HEADROOM = 14;

/** The world-space box that holds a part of `size` at `cframe`, however it is rotated. */
export function boxOf(cframe: CFrame, size: Vector3): Box {
	const right = cframe.RightVector;
	const up = cframe.UpVector;
	const look = cframe.LookVector;
	const half = size.div(2);
	const extent = new Vector3(
		math.abs(right.X) * half.X + math.abs(up.X) * half.Y + math.abs(look.X) * half.Z,
		math.abs(right.Y) * half.X + math.abs(up.Y) * half.Y + math.abs(look.Y) * half.Z,
		math.abs(right.Z) * half.X + math.abs(up.Z) * half.Y + math.abs(look.Z) * half.Z,
	);
	return { min: cframe.Position.sub(extent), max: cframe.Position.add(extent) };
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

/**
 * The gap between two boxes seen from above, ignoring height: 0 when their
 * footprints touch or overlap, otherwise the distance between the nearest
 * points of the two footprints.
 */
export function planGap(a: Box, b: Box): number {
	const dx = math.max(0, a.min.X - b.max.X, b.min.X - a.max.X);
	const dz = math.max(0, a.min.Z - b.max.Z, b.min.Z - a.max.Z);
	return math.sqrt(dx * dx + dz * dz);
}

/** The corridor a ramp climbs through: its width plus a margin, from its foot to headroom above its top. */
export function rampCorridor(ramp: RampLayout): Box {
	const halfWidth = RAMP_WIDTH / 2 + RAMP_MARGIN;
	return {
		min: new Vector3(-halfWidth, math.min(ramp.from.Y, ramp.to.Y) - 3, math.min(ramp.from.Z, ramp.to.Z)),
		max: new Vector3(halfWidth, math.max(ramp.from.Y, ramp.to.Y) + RAMP_HEADROOM, math.max(ramp.from.Z, ramp.to.Z)),
	};
}

/** The gate wall across a raised terrace's front edge, or undefined for the ground. */
export function gateWall(layout: TerraceLayout): Box | undefined {
	if (layout.floorY <= 0) return undefined;
	return {
		min: new Vector3(-layout.width / 2, layout.floorY, layout.frontZ - 1),
		max: new Vector3(layout.width / 2, layout.floorY + GATE_HEIGHT, layout.frontZ),
	};
}

/**
 * Every box a collidable prop must stay out of: the zone's clear zones, the
 * corridors of its ramps, and the gate wall on each raised terrace's front
 * edge (built whether or not that ramp is gated, to stay safe).
 */
export function keepClearBoxes(
	clearZones: readonly ClearZone[],
	ramps: readonly RampLayout[],
	terraces: readonly TerraceLayout[],
): Box[] {
	const boxes: Box[] = [];
	for (const zone of clearZones) boxes.push(boxOf(zone.cframe, zone.size));
	for (const ramp of ramps) boxes.push(rampCorridor(ramp));
	for (const terrace of terraces) {
		const wall = gateWall(terrace);
		if (wall) boxes.push(wall);
	}
	return boxes;
}
