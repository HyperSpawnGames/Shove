import type { RampLayout, TerraceLayout } from "../../world-layout";
import type { ClearZone } from "../types";
import { Box, boxBetween, boxOf } from "./geometry";

/** What the volcanic dressing needs to know of its stretch: a ZoneContext satisfies it. */
export interface VolcanicSite {
	terraces: readonly TerraceLayout[];
	ramps: readonly RampLayout[];
	clearZones: readonly ClearZone[];
}

/** Half the ramp's width (staircase.ts builds it 16 wide) plus a margin to walk past its edges. */
const RAMP_CORRIDOR_HALF_WIDTH = 8 + 3;
/** Headroom over a ramp's surface, for the tallest player jumping. */
const RAMP_HEADROOM = 14;
/**
 * The gate wall staircase.ts builds across a raised terrace's front edge is
 * 1 deep and 14 high; the keep-out is deeper, so nothing hugs the gate or
 * crowds players stepping off the ramp.
 */
const GATE_KEEP_OUT_DEPTH = 5;
const GATE_KEEP_OUT_HEIGHT = 16;

/** The corridor over a ramp, from its foot to its top, wide enough to walk. */
export function rampCorridor(ramp: RampLayout): Box {
	const low = math.min(ramp.from.Y, ramp.to.Y) - 2;
	const high = math.max(ramp.from.Y, ramp.to.Y) + RAMP_HEADROOM;
	return boxBetween(
		new Vector3(-RAMP_CORRIDOR_HALF_WIDTH, low, ramp.from.Z),
		new Vector3(RAMP_CORRIDOR_HALF_WIDTH, high, ramp.to.Z),
	);
}

/** The band along a raised terrace's front edge where its gate wall stands. */
export function gateBand(terrace: TerraceLayout): Box {
	const half = terrace.width / 2;
	return boxBetween(
		new Vector3(-half, terrace.floorY, terrace.frontZ),
		new Vector3(half, terrace.floorY + GATE_KEEP_OUT_HEIGHT, terrace.frontZ - GATE_KEEP_OUT_DEPTH),
	);
}

/**
 * Every box no collidable prop may enter: the context's keep-clear boxes,
 * each ramp's corridor, and the gate band on every raised terrace (whether
 * or not its ramp is gated, so a roster change never strands a prop).
 */
export function keepOutBoxes(site: VolcanicSite): Box[] {
	const boxes = site.clearZones.map((zone) => boxOf(zone.cframe, zone.size));
	for (const ramp of site.ramps) boxes.push(rampCorridor(ramp));
	for (const terrace of site.terraces) if (terrace.floorY > 0) boxes.push(gateBand(terrace));
	return boxes;
}
