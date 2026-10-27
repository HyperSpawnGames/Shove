import type { TerraceLayout } from "../../world-layout";
import type { ClearZone } from "../types";
import {
	arch,
	awning,
	bones,
	cactus,
	dune,
	oasis,
	obelisk,
	palm,
	pillar,
	pots,
	type Prop,
	type PropBuilder,
	rocks,
	SAND,
	SAND_DARK,
} from "./desert-props";
import { entersClearZone, partBounds, type PartSpec } from "./part-spec";

/** The zone's part budget (docs/giant-quads.md). */
export const MAX_ZONE_PARTS = 600;
/** The default seed: the same desert every server, every run. */
export const DESERT_SEED = 20402;

/** Terrace width at which props are their natural size; wider terraces get bigger props. */
const REFERENCE_WIDTH = 90;
/** Studs every part keeps from a terrace's edges, and so from the gate wall across the front. */
const EDGE_MARGIN = 2;
/** Extra studs a prop keeps from every keep-clear box. */
const CLEAR_MARGIN = 1;
/**
 * Non-collidable parts that top out below this height above the floor (bones,
 * rugs, reeds, water) stay out of the keep-clear boxes too, so the lane and
 * pedestals look clean; taller ones (fronds, canopies) may overhang them.
 */
const LOW_DECOR_HEIGHT = 8;
/** Spots each prop tries; the oasis fits only a narrow band beside the pedestal, so this is generous. */
const ATTEMPTS = 150;
/** How high above the floor the drifting sand blows. */
const DRIFT_HEIGHT = 4;

/** Which way a prop faces, given where it stands. */
type Facing = (x: number, rng: Random) => number;

const anyWay: Facing = (_, rng) => rng.NextNumber(0, 2 * math.pi);
/** Long side along the terrace's depth, so it fits beside the lane and leaves the view up the stairs open. */
const alongDepth: Facing = (_, rng) => (rng.NextNumber() < 0.5 ? 0 : math.pi) + rng.NextNumber(-0.1, 0.1);
/** For props whose long axis is their X: turned a quarter so it runs along the depth. */
const crossways: Facing = (x, rng) => alongDepth(x, rng) + math.pi / 2;
/** Open side toward the lane. */
const towardLane: Facing = (x) => (x > 0 ? -math.pi / 2 : math.pi / 2);

interface Recipe {
	build: PropBuilder;
	count: number;
	facing: Facing;
}

/** What one terrace gets, biggest first so the big props find room. */
function recipeFor(terrace: number, hasOasis: boolean): Recipe[] {
	const recipe: Recipe[] = [];
	if (hasOasis) recipe.push({ build: oasis, count: 1, facing: alongDepth });
	recipe.push(
		terrace % 2 === 0 ? { build: arch, count: 1, facing: alongDepth } : { build: awning, count: 1, facing: towardLane },
		{ build: dune, count: 2, facing: crossways },
		{ build: pillar, count: 2, facing: anyWay },
		{ build: palm, count: hasOasis ? 0 : 2, facing: anyWay },
		{ build: cactus, count: 3, facing: anyWay },
		{ build: bones, count: 1, facing: anyWay },
		{ build: pots, count: 1, facing: anyWay },
		{ build: rocks, count: 2, facing: anyWay },
	);
	return recipe;
}

/** The size factor props on `layout` are built at. */
export function sizeFactor(layout: TerraceLayout): number {
	return layout.width / REFERENCE_WIDTH;
}

/** The sand each terrace is restyled to, alternating a shade so neighbours read apart. */
export function terraceColor(terrace: number): Color3 {
	return terrace % 2 === 0 ? SAND : SAND.Lerp(SAND_DARK, 0.45);
}

/** Which terrace holds the oasis: the second when there is one, else the first. */
export function oasisTerrace(terraceCount: number): number | undefined {
	if (terraceCount <= 0) return undefined;
	return terraceCount >= 2 ? 1 : 0;
}

interface Claim {
	x: number;
	z: number;
	radius: number;
}

/** Whether a part keeps clear of the keep-clear boxes, by the rule for its kind. */
function keepsClear(part: PartSpec, layout: TerraceLayout, zones: readonly ClearZone[]): boolean {
	const low = partBounds(part).max.Y < layout.floorY + LOW_DECOR_HEIGHT;
	if (!part.collides && !low) return true;
	return !entersClearZone(part, zones, CLEAR_MARGIN);
}

/** Whether a part's footprint stays on the terrace's top, inside the edge margin. */
export function withinTerrace(part: PartSpec, layout: TerraceLayout, margin = EDGE_MARGIN): boolean {
	const bounds = partBounds(part);
	const half = layout.width / 2 - margin;
	return (
		bounds.min.X >= -half &&
		bounds.max.X <= half &&
		bounds.min.Z >= layout.backZ + margin &&
		bounds.max.Z <= layout.frontZ - margin
	);
}

function fits(
	prop: Prop,
	x: number,
	z: number,
	layout: TerraceLayout,
	zones: readonly ClearZone[],
	claims: readonly Claim[],
): boolean {
	for (const claim of claims) {
		const reach = claim.radius + prop.radius;
		if ((claim.x - x) ** 2 + (claim.z - z) ** 2 < reach * reach) return false;
	}
	return prop.parts.every((part) => withinTerrace(part, layout) && keepsClear(part, layout, zones));
}

/** The see-through part over a terrace that the drifting sand blows from. */
function sandDrift(layout: TerraceLayout): PartSpec {
	const depth = layout.frontZ - layout.backZ - 2 * EDGE_MARGIN;
	return {
		name: "SandDrift",
		size: new Vector3(layout.width - 2 * EDGE_MARGIN, 1, depth),
		cframe: new CFrame(0, layout.floorY + DRIFT_HEIGHT, (layout.frontZ + layout.backZ) / 2),
		color: SAND,
		material: Enum.Material.SmoothPlastic,
		collides: false,
		transparency: 1,
		effect: "sandDrift",
	};
}

export interface DesertPlan {
	parts: PartSpec[];
	/** Parts planned on each terrace, bottom first. */
	perTerrace: number[];
}

/**
 * Every part of the desert's dressing, placed by seeded rejection sampling:
 * each prop tries spots on its terrace until one keeps it on the floor, off
 * the other props, and every collidable part out of every keep-clear box.
 * A prop that finds no spot, or would break the part budget, is left out.
 */
export function planDesert(
	terraces: readonly TerraceLayout[],
	clearZones: readonly ClearZone[],
	seed = DESERT_SEED,
): DesertPlan {
	const parts: PartSpec[] = [];
	const perTerrace: number[] = [];
	// One drift part per terrace is reserved up front.
	let budget = MAX_ZONE_PARTS - terraces.size();
	const withOasis = oasisTerrace(terraces.size());

	terraces.forEach((layout, terrace) => {
		const rng = new Random(seed + terrace * 7919);
		const k = sizeFactor(layout);
		const claims: Claim[] = [];
		const planned: PartSpec[] = [sandDrift(layout)];

		const accept = (prop: Prop, x: number, z: number) => {
			for (const part of prop.parts) planned.push(part);
			claims.push({ x, z, radius: prop.radius });
			budget -= prop.parts.size();
		};
		const tryAt = (build: PropBuilder, x: number, z: number, yaw: number): boolean => {
			const prop = build(new CFrame(x, layout.floorY, z).mul(CFrame.Angles(0, yaw, 0)), k, rng);
			if (prop.parts.size() > budget || !fits(prop, x, z, layout, clearZones, claims)) return false;
			accept(prop, x, z);
			return true;
		};

		// A lit obelisk either side of where the ramp arrives.
		const gateX = math.max(14, layout.width * 0.16);
		for (const side of [-1, 1]) tryAt(obelisk, side * gateX, layout.frontZ - EDGE_MARGIN - 2.5 * k, 0);

		const half = layout.width / 2 - EDGE_MARGIN;
		for (const { build, count, facing } of recipeFor(terrace, terrace === withOasis)) {
			for (let i = 0; i < count; i++) {
				for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
					// The middle of every terrace is lane and pedestal, so sample the sides.
					const x = (rng.NextNumber() < 0.5 ? -1 : 1) * rng.NextNumber(half * 0.2, half);
					const z = rng.NextNumber(layout.backZ + EDGE_MARGIN, layout.frontZ - EDGE_MARGIN);
					if (tryAt(build, x, z, facing(x, rng))) break;
				}
			}
		}

		perTerrace.push(planned.size());
		for (const part of planned) parts.push(part);
	});

	return { parts, perTerrace };
}
