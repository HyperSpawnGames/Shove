import type { TerraceLayout } from "../../world-layout";
import type { ClearZone } from "../types";
import {
	crystalCluster,
	FrostProp,
	frozenBoulder,
	frozenPond,
	iceSpire,
	icicleRow,
	PartSpec,
	snowDrift,
	snowfall,
	snowyPine,
} from "./frost-props";

/**
 * Where the frost zone's props go. Pure: the same terraces, clear zones and
 * seed always give the same props, part for part.
 *
 * The giants' clear zones span the middle of each terrace almost front to
 * back, so the glacier grows in the strips either side. Every part on the
 * ground, solid or not, stays out of every clear zone's footprint from the
 * ground to the sky, and anything tall keeps a wider margin, so nothing hides
 * a giant or the view up the lane. Icicles hang from the cliff faces below
 * the floor, clear of the ramps; the snowfall sheet floats above every clear
 * zone.
 */

export const FROST_SEED = 5;
/** The zone's part budget across all its terraces. */
export const MAX_FROST_PARTS = 600;
/** Studs every prop keeps from a clear zone, from the terrace's edges, and from another prop's footprint. */
export const CLEARANCE = 1;
/** Studs tall props (spires, pine crowns) keep from a clear zone, so the view up the lane stays open. */
export const VIEW_MARGIN = 4;
/** Studs the snowfall sheet floats above the highest clear zone on its terrace. */
export const SNOW_ABOVE_ZONES = 8;

/** An axis-aligned box in world space. */
export interface Bounds {
	min: Vector3;
	max: Vector3;
}

/** The world-space box around a (possibly rotated) box of `size` at `cframe`. */
export function worldBounds(cframe: CFrame, size: Vector3): Bounds {
	const half = size.div(2);
	const extent = cframe.XVector.Abs()
		.mul(half.X)
		.add(cframe.YVector.Abs().mul(half.Y))
		.add(cframe.ZVector.Abs().mul(half.Z));
	return { min: cframe.Position.sub(extent), max: cframe.Position.add(extent) };
}

/** Whether two boxes overlap in plan view (X and Z), with `gap` studs to spare. */
export function overlapsInPlan(a: Bounds, b: Bounds, gap = 0): boolean {
	return a.min.X < b.max.X + gap && b.min.X < a.max.X + gap && a.min.Z < b.max.Z + gap && b.min.Z < a.max.Z + gap;
}

/** Whether two boxes overlap in space. */
export function overlaps(a: Bounds, b: Bounds): boolean {
	return overlapsInPlan(a, b) && a.min.Y < b.max.Y && b.min.Y < a.max.Y;
}

/** The studs a part keeps from every clear zone in plan view. */
export function marginFor(part: PartSpec): number {
	return part.tall ? VIEW_MARGIN : CLEARANCE;
}

/** The box around all of `parts`. */
function unionBounds(parts: readonly PartSpec[]): Bounds {
	let result = worldBounds(parts[0].cframe, parts[0].size);
	for (const part of parts) {
		const box = worldBounds(part.cframe, part.size);
		result = { min: result.min.Min(box.min), max: result.max.Max(box.max) };
	}
	return result;
}

/** One terrace's dressing. */
export interface FrostTerrace {
	terrace: TerraceLayout;
	props: FrostProp[];
}

export function countParts(plan: readonly FrostTerrace[]): number {
	let total = 0;
	for (const entry of plan) for (const prop of entry.props) total += prop.parts.size();
	return total;
}

type GroundKind = "pond" | "spire" | "pine" | "crystals" | "boulder" | "drift";

/**
 * How many of each ground prop a terrace tries for, biggest first so a tight
 * budget drops the clutter. With ICICLE_ROWS of ICICLES_PER_ROW and the
 * snowfall sheet, a terrace never asks for more than 150 parts, so four fit
 * MAX_FROST_PARTS without trimming.
 */
const RECIPE: readonly { kind: GroundKind; count: number }[] = [
	{ kind: "pond", count: 1 },
	{ kind: "spire", count: 2 },
	{ kind: "pine", count: 4 },
	{ kind: "crystals", count: 3 },
	{ kind: "boulder", count: 5 },
	{ kind: "drift", count: 5 },
];
const ICICLE_ROWS = 7;
const ICICLES_PER_ROW = 5;
const ATTEMPTS = 200;

/** The highest clear-zone top over `terrace`, or its floor when none reaches it. */
function zonesTop(terrace: TerraceLayout, zones: readonly Bounds[]): number {
	const halfWidth = terrace.width / 2;
	const floor: Bounds = {
		min: new Vector3(-halfWidth, terrace.floorY, terrace.backZ),
		max: new Vector3(halfWidth, terrace.floorY, terrace.frontZ),
	};
	let top = terrace.floorY;
	for (const zone of zones) if (overlapsInPlan(floor, zone)) top = math.max(top, zone.max.Y);
	return top;
}

/** Lays one terrace's glacier, within `budget` parts. */
function planTerrace(terrace: TerraceLayout, zones: readonly Bounds[], rng: Random, budget: number): FrostProp[] {
	// Props scale with the terrace: a bigger giant's floor gets bigger spires.
	const unit = math.clamp(terrace.width / 100, 0.5, 4);
	const halfWidth = terrace.width / 2;
	const depth = terrace.frontZ - terrace.backZ;
	const floor: Bounds = {
		min: new Vector3(-halfWidth + CLEARANCE, terrace.floorY - 1, terrace.backZ + CLEARANCE),
		max: new Vector3(halfWidth - CLEARANCE, terrace.floorY + 1, terrace.frontZ - CLEARANCE),
	};
	const props: FrostProp[] = [];
	const taken: Bounds[] = [];
	let used = 0;

	const clearOfZones = (prop: FrostProp): boolean => {
		for (const part of prop.parts) {
			const box = worldBounds(part.cframe, part.size);
			for (const zone of zones) if (overlapsInPlan(box, zone, marginFor(part))) return false;
		}
		return true;
	};
	const clearOfProps = (box: Bounds): boolean => {
		for (const other of taken) if (overlapsInPlan(box, other, CLEARANCE)) return false;
		return true;
	};
	const add = (prop: FrostProp, box?: Bounds): void => {
		props.push(prop);
		used += prop.parts.size();
		if (box !== undefined) taken.push(box);
	};

	// Snow drifts down over the whole terrace from above the spires and every clear zone.
	const sheetY = math.max(zonesTop(terrace, zones) + SNOW_ABOVE_ZONES, terrace.floorY + 48 * unit);
	add(
		snowfall(
			new CFrame(0, sheetY + 0.5, (terrace.frontZ + terrace.backZ) / 2),
			new Vector3(terrace.width, 1, depth),
			sheetY + 0.5 - terrace.floorY,
		),
	);

	const make = (kind: GroundKind, ground: CFrame): FrostProp => {
		switch (kind) {
			case "pond":
				return frozenPond(rng, ground, unit);
			case "spire":
				return iceSpire(rng, ground, unit);
			case "pine":
				return snowyPine(rng, ground, unit);
			case "crystals":
				return crystalCluster(rng, ground, unit);
			case "boulder":
				return frozenBoulder(rng, ground, unit);
			case "drift":
				return snowDrift(rng, ground, unit);
		}
	};

	for (const { kind, count } of RECIPE) {
		for (let placed = 0; placed < count; placed++) {
			let found = false;
			for (let attempt = 0; attempt < ATTEMPTS && !found; attempt++) {
				const x = rng.NextNumber(floor.min.X, floor.max.X);
				const z = rng.NextNumber(floor.min.Z, floor.max.Z);
				const ground = new CFrame(x, terrace.floorY, z).mul(CFrame.Angles(0, rng.NextNumber(0, 2 * math.pi), 0));
				const prop = make(kind, ground);
				if (used + prop.parts.size() > budget) break;
				const box = unionBounds(prop.parts);
				if (box.min.X < floor.min.X || box.max.X > floor.max.X) continue;
				if (box.min.Z < floor.min.Z || box.max.Z > floor.max.Z) continue;
				if (!clearOfZones(prop) || !clearOfProps(box)) continue;
				add(prop, box);
				found = true;
			}
			if (!found) break;
		}
	}

	// Icicles hang down the two side cliffs and the front one, where a player climbing the ramp sees them.
	const edges = [
		{
			frame: CFrame.lookAt(new Vector3(-halfWidth, terrace.floorY, 0), new Vector3(-halfWidth - 1, terrace.floorY, 0)),
			long: false,
		},
		{
			frame: CFrame.lookAt(new Vector3(halfWidth, terrace.floorY, 0), new Vector3(halfWidth + 1, terrace.floorY, 0)),
			long: false,
		},
		{
			frame: CFrame.lookAt(
				new Vector3(0, terrace.floorY, terrace.frontZ),
				new Vector3(0, terrace.floorY, terrace.frontZ + 1),
			),
			long: true,
		},
	];
	const hanging: Bounds[] = [];
	for (let row = 0; row < ICICLE_ROWS; row++) {
		if (used + ICICLES_PER_ROW > budget) break;
		for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
			const edge = edges[rng.NextInteger(0, edges.size() - 1)];
			const along = edge.long ? rng.NextNumber(-halfWidth, halfWidth) : rng.NextNumber(terrace.backZ, terrace.frontZ);
			// The side edges run along Z with the terrace's middle at z = 0 in `frame`; shift to the sample.
			const at = edge.long
				? edge.frame.mul(new CFrame(-along, 0, 0))
				: new CFrame(edge.frame.X, edge.frame.Y, along).mul(edge.frame.Rotation);
			const prop = icicleRow(rng, at, unit, ICICLES_PER_ROW);
			const box = unionBounds(prop.parts);
			if (box.max.Y > terrace.floorY + 0.01) continue;
			if (
				edge.long
					? box.min.X < floor.min.X || box.max.X > floor.max.X
					: box.min.Z < floor.min.Z || box.max.Z > floor.max.Z
			) {
				continue;
			}
			if (!clearOfZones(prop) || hanging.some((other) => overlapsInPlan(box, other, CLEARANCE))) continue;
			add(prop);
			hanging.push(box);
			break;
		}
	}
	return props;
}

/**
 * The glacier on each of `terraces`, bottom first. Works for any number of
 * terraces, splitting MAX_FROST_PARTS evenly between them.
 */
export function planFrost(
	terraces: readonly TerraceLayout[],
	clearZones: readonly ClearZone[],
	seed = FROST_SEED,
): FrostTerrace[] {
	if (terraces.size() === 0) return [];
	const zones = clearZones.map((zone) => worldBounds(zone.cframe, zone.size));
	const budget = math.floor(MAX_FROST_PARTS / terraces.size());
	return terraces.map((terrace, index) => ({
		terrace,
		props: planTerrace(terrace, zones, new Random(seed * 7919 + index), budget),
	}));
}
