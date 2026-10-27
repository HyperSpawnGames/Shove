import type { TerraceLayout } from "../../world-layout";
import type { ClearZone } from "../types";
import {
	fallenLog,
	fireflies,
	fern,
	ForestProp,
	mossPatch,
	mossyBoulder,
	mushroomCluster,
	PartSpec,
	sunbeam,
	tree,
} from "./forest-props";

/**
 * Where the forest's props go. Pure: the same terraces, clear zones and seed
 * always give the same props, part for part.
 *
 * The giants' clear zones span the middle of each terrace front to back, so
 * the woods grow in the two strips either side. Every part, collidable or
 * not, stays out of every clear zone's footprint from the ground to the sky:
 * that keeps the fights and the climb reachable, and keeps canopies and light
 * shafts from hanging over the lane, so nothing hides a giant or the view up
 * the staircase.
 */

export const FOREST_SEED = 3;
/** The zone's part budget across all its terraces. */
export const MAX_FOREST_PARTS = 600;
/** Studs every prop keeps from a clear zone, from the terrace's edges, and from another prop's footprint. */
export const CLEARANCE = 1;
/** Studs canopies and light shafts keep from a clear zone, so the view up the lane stays open. */
export const VIEW_MARGIN = 4;

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

/** The plan-view box around a prop's ground-level parts: what other props must not stand on. */
function footprint(parts: readonly PartSpec[]): Bounds | undefined {
	let result: Bounds | undefined;
	for (const part of parts) {
		if (part.overhead) continue;
		const box = worldBounds(part.cframe, part.size);
		result = result === undefined ? box : { min: result.min.Min(box.min), max: result.max.Max(box.max) };
	}
	return result;
}

/** One terrace's woods. */
export interface ForestTerrace {
	terrace: TerraceLayout;
	props: ForestProp[];
}

export function countParts(plan: readonly ForestTerrace[]): number {
	let total = 0;
	for (const entry of plan) for (const prop of entry.props) total += prop.parts.size();
	return total;
}

/** How many of each prop a terrace tries for, biggest first so a tight budget drops the clutter. */
const RECIPE: readonly { kind: ForestProp["kind"]; count: number }[] = [
	{ kind: "tree", count: 6 },
	{ kind: "fireflies", count: 2 },
	{ kind: "sunbeam", count: 2 },
	{ kind: "log", count: 2 },
	{ kind: "boulder", count: 4 },
	{ kind: "mushrooms", count: 4 },
	{ kind: "fern", count: 8 },
	{ kind: "moss", count: 5 },
];
const ATTEMPTS = 200;

/** Lays one terrace's woods, within `budget` parts. */
function planTerrace(terrace: TerraceLayout, zones: readonly Bounds[], rng: Random, budget: number): ForestProp[] {
	// Props scale with the terrace: a bigger giant's floor gets bigger trees.
	const unit = math.clamp(terrace.width / 100, 0.5, 4);
	const halfWidth = terrace.width / 2;
	const floor: Bounds = {
		min: new Vector3(-halfWidth + CLEARANCE, terrace.floorY - 1, terrace.backZ + CLEARANCE),
		max: new Vector3(halfWidth - CLEARANCE, terrace.floorY + 1, terrace.frontZ - CLEARANCE),
	};
	const props: ForestProp[] = [];
	const taken: Bounds[] = [];
	let used = 0;
	let glowing = 0;

	const fits = (prop: ForestProp): boolean => {
		for (const part of prop.parts) {
			const box = worldBounds(part.cframe, part.size);
			const gap = part.overhead ? VIEW_MARGIN : CLEARANCE;
			for (const zone of zones) if (overlapsInPlan(box, zone, gap)) return false;
			// Canopies and beams may lean out over the cliff; everything on the ground stays on the floor.
			if (part.overhead) continue;
			if (box.min.X < floor.min.X || box.max.X > floor.max.X) return false;
			if (box.min.Z < floor.min.Z || box.max.Z > floor.max.Z) return false;
		}
		const base = footprint(prop.parts);
		if (base !== undefined) for (const other of taken) if (overlapsInPlan(base, other, CLEARANCE)) return false;
		return true;
	};

	const make = (kind: ForestProp["kind"], ground: CFrame): ForestProp => {
		switch (kind) {
			case "tree":
				// Away from the staircase's centre line, where the lane and the giants are.
				return tree(rng, ground, unit, rng.NextNumber(7, 10) * unit, new Vector3(ground.X < 0 ? -1 : 1, 0, 0));
			case "log":
				return fallenLog(rng, ground, unit);
			case "boulder":
				return mossyBoulder(rng, ground, unit);
			case "mushrooms":
				return mushroomCluster(rng, ground, unit, glowing < 2 && rng.NextNumber() < 0.6);
			case "fern":
				return fern(rng, ground, unit);
			case "moss":
				return mossPatch(rng, ground, unit);
			case "sunbeam":
				return sunbeam(rng, ground, unit);
			case "fireflies":
				return fireflies(ground, new Vector3(10, 10, 24).mul(unit));
		}
	};

	for (const { kind, count } of RECIPE) {
		for (let placed = 0; placed < count; placed++) {
			for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
				const x = rng.NextNumber(floor.min.X, floor.max.X);
				const z = rng.NextNumber(floor.min.Z, floor.max.Z);
				// Logs lie roughly front to back, along the strips; the rest face anywhere.
				const yaw = kind === "log" ? rng.NextNumber(-0.4, 0.4) : rng.NextNumber(0, 2 * math.pi);
				const ground = new CFrame(x, terrace.floorY, z).mul(CFrame.Angles(0, yaw, 0));
				const prop = make(kind, ground);
				if (used + prop.parts.size() > budget) return props;
				if (!fits(prop)) continue;
				props.push(prop);
				used += prop.parts.size();
				if (kind === "mushrooms" && prop.parts.some((part) => part.effect === "glow")) glowing += 1;
				// Moss patches lie under things, and light and air pass through them.
				const base = footprint(prop.parts);
				if (base !== undefined && kind !== "moss" && kind !== "sunbeam" && kind !== "fireflies") {
					taken.push(base);
				}
				break;
			}
		}
	}
	return props;
}

/**
 * The woods on each of `terraces`, bottom first. Works for any number of
 * terraces, splitting MAX_FOREST_PARTS evenly between them.
 */
export function planForest(
	terraces: readonly TerraceLayout[],
	clearZones: readonly ClearZone[],
	seed = FOREST_SEED,
): ForestTerrace[] {
	if (terraces.size() === 0) return [];
	const zones = clearZones.map((zone) => worldBounds(zone.cframe, zone.size));
	const budget = math.floor(MAX_FOREST_PARTS / terraces.size());
	return terraces.map((terrace, index) => ({
		terrace,
		props: planTerrace(terrace, zones, new Random(seed * 7919 + index), budget),
	}));
}
