import type { TerraceLayout } from "../../world-layout";
import { Box, boxBetween, boxOf, planGap } from "./geometry";
import { keepOutBoxes, rampCorridor, VolcanicSite } from "./keep-out";
import {
	charredTree,
	lavaFall,
	lavaPool,
	lavaRun,
	Piece,
	rockCluster,
	rockHeight,
	smokingVent,
	VENT_HEIGHT,
	volcanicCone,
} from "./pieces";

/** Same seed, same zone: every server and every test sees the identical layout. */
export const VOLCANIC_SEED = 7007;
export const ZONE_PART_BUDGET = 600;
/** Plan-view studs every solid prop keeps from a keep-out box. */
export const KEEP_OUT_GAP = 2;
/** Plan-view studs between two props, and between a prop and the lava. */
const PROP_GAP = 1;
/** Studs kept free along a terrace's side edges. */
const EDGE = 1.5;
/** The band along each side edge the lava river runs in. */
export const LAVA_BAND = 10;
const RIVER_WIDTH = 4;
const RIVER_RUNS = 6;
/** Studs behind the front edge where the side dressing starts: clear of the gate and the ramp's top. */
const FRONT_MARGIN = 8;
/** Lava falls this far down a terrace's side face, or to the ground if that is nearer. */
const FALL_DROP = 40;
const PLACEMENT_ATTEMPTS = 40;
/** Props only taller than this stand on the side strips, beside the giant rather than in front of it. */
export const LOW_PROP_HEIGHT = 3.5;
/** No prop stands taller than this above its floor, so none hides a giant from the lane. */
export const MAX_PROP_HEIGHT = 24;

/** Scale props with the zone: a terrace 150 wide is the 1x the sizes below were drawn at. */
function propScale(terrace: TerraceLayout): number {
	return math.clamp(terrace.width / 150, 0.75, 1.2);
}

interface PropKind {
	radius: [number, number];
	height: (radius: number, rng: Random) => number;
	make: (floor: Vector3, radius: number, height: number, rng: Random) => Piece[];
}

const CONE: PropKind = {
	radius: [4.5, 6],
	height: (_, rng) => rng.NextNumber(14, 19),
	make: volcanicCone,
};
const TREE: PropKind = {
	radius: [3.5, 5],
	height: (_, rng) => rng.NextNumber(14, 20),
	make: charredTree,
};
const VENT: PropKind = {
	radius: [2.2, 3],
	height: () => VENT_HEIGHT,
	make: (floor, radius, _, rng) => smokingVent(floor, radius, rng),
};
const ROCKS: PropKind = {
	radius: [3, 4.5],
	height: (radius) => rockHeight(radius),
	make: (floor, radius, _, rng) => rockCluster(floor, radius, 3, rng),
};
const SHARDS: PropKind = {
	radius: [1.4, 2.2],
	height: (radius) => rockHeight(radius),
	make: (floor, radius, _, rng) => rockCluster(floor, radius, 2, rng),
};

/** What each side strip of a terrace holds, biggest first so they find room. */
const SIDE_PROPS: readonly [PropKind, number][] = [
	[CONE, 1],
	[TREE, 2],
	[ROCKS, 3],
	[VENT, 2],
];
/** Low obsidian shards scattered anywhere a player is not meant to stand. */
const SHARDS_PER_TERRACE = 6;

/** A plan-view rectangle props are drawn from. */
interface Region {
	xMin: number;
	xMax: number;
	zMin: number;
	zMax: number;
}

/**
 * How far from the middle the keep-clear boxes over `terrace` reach: the
 * pedestal and lane zones, and the ramp corridors. The side strips start
 * past it.
 */
export function sideClearance(site: VolcanicSite, terrace: TerraceLayout): number {
	const boxes = site.clearZones.map((zone) => boxOf(zone.cframe, zone.size));
	for (const ramp of site.ramps) boxes.push(rampCorridor(ramp));
	let clearance = 0;
	for (const box of boxes) {
		if (box.max.Z <= terrace.backZ || box.min.Z >= terrace.frontZ) continue;
		clearance = math.max(clearance, math.abs(box.min.X), math.abs(box.max.X));
	}
	return clearance;
}

/** Where the side strip on `side` (-1 or 1) lies: past the clearance, short of the lava band. */
export function sideStrip(site: VolcanicSite, terrace: TerraceLayout, side: number): Region {
	const inner = sideClearance(site, terrace) + KEEP_OUT_GAP;
	const outer = terrace.width / 2 - EDGE - LAVA_BAND - PROP_GAP;
	return {
		xMin: side > 0 ? inner : -outer,
		xMax: side > 0 ? outer : -inner,
		zMin: terrace.backZ + EDGE,
		zMax: terrace.frontZ - FRONT_MARGIN,
	};
}

/** A river of lava down the outer band on `side`, pooling once and spilling over the edge. */
function planLava(terrace: TerraceLayout, side: number, rng: Random): Piece[] {
	const halfWidth = terrace.width / 2;
	const middle = side * (halfWidth - EDGE - LAVA_BAND / 2);
	const wiggle = LAVA_BAND / 2 - RIVER_WIDTH / 2 - 1;
	const zStart = terrace.frontZ - FRONT_MARGIN;
	const zEnd = terrace.backZ + EDGE + RIVER_WIDTH;
	const poolAt = rng.NextInteger(2, RIVER_RUNS - 2);
	const points: Vector3[] = [];
	for (let k = 0; k <= RIVER_RUNS; k++) {
		const x = k === poolAt ? middle : middle + rng.NextNumber(-wiggle, wiggle);
		points.push(new Vector3(x, terrace.floorY, zStart + ((zEnd - zStart) * k) / RIVER_RUNS));
	}
	const pieces: Piece[] = [];
	for (let k = 0; k < RIVER_RUNS; k++) pieces.push(lavaRun("LavaRiver", points[k], points[k + 1], RIVER_WIDTH));

	const pool = points[poolAt];
	for (const piece of lavaPool(pool, LAVA_BAND - 3, LAVA_BAND - 0.5)) pieces.push(piece);
	const lip = new Vector3(side * halfWidth, terrace.floorY, pool.Z);
	pieces.push(lavaRun("LavaChannel", pool, lip, 3));
	const drop = math.min(FALL_DROP, terrace.floorY);
	if (drop > 2) pieces.push(lavaFall(lip, side, drop, 3.5));
	return pieces;
}

/** Everything placed so far on the zone, and what is left of the budget. */
interface Placing {
	pieces: Piece[];
	keepOut: readonly Box[];
	/** Footprints of the props and lava already down, which new props keep clear of. */
	taken: Box[];
	rng: Random;
}

function add(placing: Placing, pieces: readonly Piece[]): boolean {
	if (placing.pieces.size() + pieces.size() > ZONE_PART_BUDGET) return false;
	for (const piece of pieces) placing.pieces.push(piece);
	return true;
}

/**
 * Drops one prop of `kind` somewhere in `region` that clears every keep-out
 * box by KEEP_OUT_GAP and every earlier prop and the lava by PROP_GAP, or
 * nothing when no try fits. The prop's own parts are checked again, so a
 * generator that strayed outside its footprint loses its prop rather than
 * blocking the climb.
 */
function place(placing: Placing, kind: PropKind, region: Region, floorY: number, scale: number): void {
	const { rng, keepOut, taken } = placing;
	for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
		const radius = math.min(
			rng.NextNumber(kind.radius[0], kind.radius[1]) * scale,
			(region.xMax - region.xMin) / 2,
			(region.zMax - region.zMin) / 2,
		);
		// A strip too narrow for this kind at a recognisable size goes without it.
		if (radius < 0.6 * kind.radius[0] * scale) return;
		const height = math.min(kind.height(radius, rng) * scale, MAX_PROP_HEIGHT);
		const floor = new Vector3(
			rng.NextNumber(region.xMin + radius, region.xMax - radius),
			floorY,
			rng.NextNumber(region.zMin + radius, region.zMax - radius),
		);
		const footprint = boxBetween(
			floor.sub(new Vector3(radius, 0, radius)),
			floor.add(new Vector3(radius, height, radius)),
		);
		if (keepOut.some((box) => planGap(footprint, box) < KEEP_OUT_GAP)) continue;
		if (taken.some((box) => planGap(footprint, box) < PROP_GAP)) continue;

		const pieces = kind.make(floor, radius, height, rng);
		const strays = pieces.some(
			(piece) => piece.collide && keepOut.some((box) => planGap(boxOf(piece.cframe, piece.size), box) < KEEP_OUT_GAP),
		);
		if (strays) continue;
		if (add(placing, pieces)) taken.push(footprint);
		return;
	}
}

/**
 * The whole volcanic dressing for `site`, as parts to build: lava down both
 * sides of every terrace, cones, dead trees, rocks and vents on the side
 * strips beside the giant, and low shards wherever the floor is free. Pure
 * and deterministic for a given seed.
 */
export function planVolcanicZone(site: VolcanicSite, seed = VOLCANIC_SEED): Piece[] {
	const placing: Placing = { pieces: [], keepOut: keepOutBoxes(site), taken: [], rng: new Random(seed) };
	for (const terrace of site.terraces) {
		const scale = propScale(terrace);
		const halfWidth = terrace.width / 2;
		for (const side of [-1, 1]) {
			const strip = sideStrip(site, terrace, side);
			// Too narrow a terrace for its giant: no lava or side props, rather than crowding the pedestal.
			if (strip.xMax - strip.xMin < 0) continue;
			const lava = planLava(terrace, side, placing.rng);
			if (!add(placing, lava)) continue;
			for (const piece of lava) placing.taken.push(boxOf(piece.cframe, piece.size));
			for (const [kind, count] of SIDE_PROPS) {
				for (let i = 0; i < count; i++) place(placing, kind, strip, terrace.floorY, scale);
			}
		}
		const floorRegion: Region = {
			xMin: -halfWidth + EDGE,
			xMax: halfWidth - EDGE,
			zMin: terrace.backZ + EDGE,
			zMax: terrace.frontZ - EDGE,
		};
		for (let i = 0; i < SHARDS_PER_TERRACE; i++) place(placing, SHARDS, floorRegion, terrace.floorY, scale);
	}
	return placing.pieces;
}
