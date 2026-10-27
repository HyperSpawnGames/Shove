import { RAMP_RUN, RampLayout, RISE_PER_SLOT, TerraceLayout } from "../../world-layout";
import type { ClearZone } from "../types";
import { allClear, PartSpec } from "./part-spec";
import { bush, fence, flowers, HILL_GREENS, hill, hillSurface, path, PROP_RADIUS, rock, signpost, tree } from "./props";

/** What the Grassland is planned from: the quad's slice of the staircase. */
export interface GrasslandLayout {
	terraces: readonly TerraceLayout[];
	ramps: readonly RampLayout[];
	clearZones: readonly ClearZone[];
}

export const GRASSLAND_PART_BUDGET = 600;
/** Same seed, same meadow: the world is identical every run. */
const SEED = 1;
/** Half the side of the 512-stud baseplate centred on the spawn. */
const BASEPLATE_HALF = 256;
/** Half the walking lane laneClearZone keeps clear down a terrace's middle. */
const LANE_HALF = 10;
/** The staircase's ramps are 16 wide; their keep-clear corridor adds room either side. */
const RAMP_CLEAR_WIDTH = 22;
/** Headroom kept over a ramp, and the gate wall's height on a terrace's front edge. */
const HEADROOM = 12;
const GATE_HEIGHT = 14;
/** How far the meadow reaches past the widest terrace, either side. */
const MEADOW_REACH = 110;
/** Grass sits this far above the floor, under the path, so the two never flicker. */
const GRASS_LIFT = 0.08;

const TERRACE_GREENS = [Color3.fromRGB(104, 172, 72), Color3.fromRGB(92, 160, 64)];
const MEADOW_GREEN = Color3.fromRGB(96, 166, 66);

/** A terrace's colour: neighbouring terraces alternate two greens so each step reads. */
export function terraceColor(index: number): Color3 {
	return TERRACE_GREENS[index % TERRACE_GREENS.size()];
}

/** How big to make props on `terrace`: 1 on the first, growing with the terrace's width. */
export function terraceScale(terrace: TerraceLayout): number {
	return math.clamp(terrace.width / 70, 1, 3);
}

/** The box over a ramp from `from` to `to`, with headroom, that must stay walkable. */
export function rampCorridor(from: Vector3, to: Vector3): ClearZone {
	const low = math.min(from.Y, to.Y);
	const high = math.max(from.Y, to.Y) + HEADROOM;
	const length = math.abs(from.Z - to.Z) + 4;
	return {
		cframe: new CFrame(0, (low + high) / 2, (from.Z + to.Z) / 2),
		size: new Vector3(RAMP_CLEAR_WIDTH, high - low, length),
	};
}

/**
 * Boxes the staircase needs clear beyond the context's own: every ramp,
 * the ramp off the top terrace to the next quad, and the gate wall along
 * each raised terrace's front edge.
 */
export function extraClearZones(layout: GrasslandLayout): ClearZone[] {
	const zones = layout.ramps.map((ramp) => rampCorridor(ramp.from, ramp.to));
	const last = layout.terraces[layout.terraces.size() - 1];
	if (last !== undefined) {
		const from = new Vector3(0, last.floorY, last.backZ);
		zones.push(rampCorridor(from, from.add(new Vector3(0, RISE_PER_SLOT, -RAMP_RUN))));
	}
	for (const terrace of layout.terraces) {
		if (terrace.floorY <= 0) continue;
		zones.push({
			cframe: new CFrame(0, terrace.floorY + GATE_HEIGHT / 2, terrace.frontZ - 0.5),
			size: new Vector3(terrace.width, GATE_HEIGHT, 1),
		});
	}
	return zones;
}

/** The walkable top of each terrace, which ground props (hills, their trees) must not poke through. */
function terraceTops(layout: GrasslandLayout): ClearZone[] {
	return layout.terraces.map((terrace) => ({
		cframe: new CFrame(0, terrace.floorY + 25, (terrace.frontZ + terrace.backZ) / 2),
		size: new Vector3(terrace.width, 50, terrace.frontZ - terrace.backZ),
	}));
}

/** Clamps like math.clamp, but settles on the middle when the range is empty instead of erroring. */
function settle(value: number, low: number, high: number): number {
	return low > high ? (low + high) / 2 : math.clamp(value, low, high);
}

/** A stretch of the climb, a terrace or the ramp gap after one, that the meadow lines either side. */
interface Stretch {
	z: number;
	depth: number;
	halfWidth: number;
	floorY: number;
}

interface Spot {
	x: number;
	z: number;
	radius: number;
}

function crowded(spots: readonly Spot[], x: number, z: number, radius: number): boolean {
	return spots.some((spot) => math.sqrt((spot.x - x) ** 2 + (spot.z - z) ** 2) < spot.radius + radius);
}

/**
 * Tries random spots in the rectangle (x from minX to maxX, on either side
 * of the middle), keeping up to `count` props that clear every keep-clear
 * box and every prop already placed.
 */
function scatter(
	rng: Random,
	parts: PartSpec[],
	spots: Spot[],
	keepClear: readonly ClearZone[],
	area: { minX: number; maxX: number; minZ: number; maxZ: number; floorY: number },
	radius: number,
	count: number,
	make: (base: Vector3) => PartSpec[],
): void {
	if (area.minX > area.maxX || area.minZ > area.maxZ) return;
	let placed = 0;
	for (let attempt = 0; attempt < count * 15 && placed < count; attempt++) {
		let x = rng.NextNumber(area.minX, area.maxX);
		if (rng.NextNumber() < 0.5) x = -x;
		const z = rng.NextNumber(area.minZ, area.maxZ);
		if (crowded(spots, x, z, radius)) continue;
		const prop = make(new Vector3(x, area.floorY, z));
		if (!allClear(prop, keepClear)) continue;
		for (const part of prop) parts.push(part);
		spots.push({ x, z, radius });
		placed += 1;
	}
}

/** The first terrace's grass carpet, laid over the baseplate like the raised terraces' tops. */
function groundCarpet(group: string, terrace: TerraceLayout, color: Color3): PartSpec {
	const depth = terrace.frontZ - terrace.backZ;
	return {
		group,
		name: "Grass",
		shape: "block",
		size: new Vector3(terrace.width, 1, depth),
		cframe: new CFrame(0, terrace.floorY + GRASS_LIFT - 0.5, (terrace.frontZ + terrace.backZ) / 2),
		color,
		material: Enum.Material.Grass,
		collide: false,
	};
}

/** The signpost by the foot of the first terrace, as close to the lane as the keep-clear boxes allow. */
function placeSignpost(
	group: string,
	terrace: TerraceLayout,
	k: number,
	keepClear: readonly ClearZone[],
): { parts: PartSpec[]; spot: Spot } | undefined {
	const z = terrace.frontZ - 4 * k;
	for (let x = LANE_HALF + 4 * k; x < terrace.width / 2 - 3 * k; x += 1) {
		const parts = signpost(group, new Vector3(x, terrace.floorY, z), k);
		if (allClear(parts, keepClear)) return { parts, spot: { x, z, radius: PROP_RADIUS.sign * k } };
	}
	return undefined;
}

function dressTerrace(index: number, terrace: TerraceLayout, keepClear: readonly ClearZone[]): PartSpec[] {
	const rng = new Random(SEED + 97 * (index + 1));
	const group = `Terrace${index + 1}`;
	const k = terraceScale(terrace);
	const halfWidth = terrace.width / 2;
	const raised = terrace.floorY > 0;
	const parts: PartSpec[] = [];
	const spots: Spot[] = [];

	if (!raised) parts.push(groundCarpet(group, terrace, terraceColor(index)));
	parts.push(path(group, terrace.floorY, terrace.frontZ, terrace.backZ, 9 * k));

	// Fence along both sides and the back, leaving the lane open to the ramp.
	const fenceX = halfWidth - 1.2 * k;
	const fenceFront = terrace.frontZ - (raised ? 2 : 1) * k;
	const fenceBack = terrace.backZ + 1.2 * k;
	const fenceY = terrace.floorY;
	for (const side of [-1, 1]) {
		const runs = [
			fence(group, new Vector3(side * fenceX, fenceY, fenceFront), new Vector3(side * fenceX, fenceY, fenceBack), k),
			fence(
				group,
				new Vector3(side * (fenceX - 1.5 * k), fenceY, fenceBack),
				new Vector3(side * (LANE_HALF + 2), fenceY, fenceBack),
				k,
			),
		];
		for (const run of runs) if (allClear(run, keepClear)) for (const part of run) parts.push(part);
	}

	if (!raised) {
		const sign = placeSignpost(group, terrace, k, keepClear);
		if (sign) {
			for (const part of sign.parts) parts.push(part);
			spots.push(sign.spot);
		}
	}

	const inset = 2.5 * k;
	const area = (radius: number, fromX: number) => ({
		minX: math.max(fromX, 0),
		maxX: halfWidth - inset - radius,
		minZ: terrace.backZ + inset + radius,
		maxZ: terrace.frontZ - inset - radius,
		floorY: terrace.floorY,
	});
	// Trees keep to the outer edges, so the giants up the hill stay in view.
	const treeRadius = PROP_RADIUS.tree * k;
	scatter(rng, parts, spots, keepClear, area(treeRadius, halfWidth * 0.6), treeRadius, 3, (base) =>
		tree(group, base, k, rng),
	);
	const rockRadius = PROP_RADIUS.rock * k;
	scatter(rng, parts, spots, keepClear, area(rockRadius, LANE_HALF), rockRadius, 4, (base) =>
		rock(group, base, k, rng),
	);
	const bushRadius = PROP_RADIUS.bush * k;
	scatter(rng, parts, spots, keepClear, area(bushRadius, LANE_HALF), bushRadius, 4, (base) =>
		bush(group, base, k, rng),
	);
	const flowerRadius = PROP_RADIUS.flowers * k;
	let patches = 0;
	scatter(rng, parts, spots, keepClear, area(flowerRadius, LANE_HALF), flowerRadius, raised ? 8 : 11, (base) => {
		patches += 1;
		return flowers(group, base, k, rng, patches % 4 === 1);
	});
	return parts;
}

/**
 * The meadow the staircase climbs out of: a grass carpet over the baseplate,
 * ground carried on past its edge under the higher terraces, and two rows
 * of rolling hills either side, some with a tree on top.
 */
function dressMeadow(layout: GrasslandLayout, keepOut: readonly ClearZone[]): PartSpec[] {
	const rng = new Random(SEED);
	const group = "Meadow";
	const terraces = layout.terraces;
	const first = terraces[0];
	const last = terraces[terraces.size() - 1];
	const widest = terraces.reduce((most, terrace) => math.max(most, terrace.width / 2), 0);
	const meadowHalf = widest + MEADOW_REACH;
	const parts: PartSpec[] = [];

	const carpetBack = math.max(last.backZ - RAMP_RUN / 2, -BASEPLATE_HALF);
	parts.push({
		group,
		name: "Grass",
		shape: "block",
		size: new Vector3(2 * meadowHalf, 1, first.frontZ - carpetBack),
		cframe: new CFrame(0, GRASS_LIFT / 2 - 0.5, (first.frontZ + carpetBack) / 2),
		color: MEADOW_GREEN,
		material: Enum.Material.Grass,
		collide: false,
	});
	const groundEnd = last.backZ - RAMP_RUN / 2;
	if (groundEnd < -BASEPLATE_HALF) {
		const thickness = 16;
		parts.push({
			group,
			name: "Ground",
			shape: "block",
			size: new Vector3(2 * meadowHalf, thickness, -BASEPLATE_HALF - groundEnd),
			cframe: new CFrame(0, GRASS_LIFT / 2 - thickness / 2, (-BASEPLATE_HALF + groundEnd) / 2),
			color: MEADOW_GREEN,
			material: Enum.Material.Grass,
			collide: true,
		});
	}

	// One stretch per terrace and per ramp gap: its middle, how wide the climb is there, and how high.
	const stretches: Stretch[] = [];
	terraces.forEach((terrace, i) => {
		stretches.push({
			z: (terrace.frontZ + terrace.backZ) / 2,
			depth: terrace.frontZ - terrace.backZ,
			halfWidth: terrace.width / 2,
			floorY: terrace.floorY,
		});
		const above = terraces[i + 1];
		if (above !== undefined)
			stretches.push({
				z: (terrace.backZ + above.frontZ) / 2,
				depth: terrace.backZ - above.frontZ,
				halfWidth: RAMP_CLEAR_WIDTH / 2,
				floorY: terrace.floorY,
			});
	});

	const zMax = first.frontZ;
	const zMin = last.backZ;
	const placeHill = (stretch: Stretch, side: number, outer: boolean) => {
		for (let attempt = 0; attempt < 6; attempt++) {
			const k = outer ? 1.5 : 1;
			const capRadius = rng.NextNumber(outer ? 26 : 16, outer ? 40 : 26) * k;
			const raisedLimit = stretch.floorY > 0 ? stretch.floorY - 2 : math.huge;
			const height = math.min(
				outer
					? rng.NextNumber(8, 16) + 0.3 * stretch.floorY
					: rng.NextNumber(5, 9) + rng.NextNumber(0.4, 0.65) * stretch.floorY,
				outer ? math.huge : raisedLimit,
			);
			// Beside a raised terrace a hill may tuck under its edge, hidden in the block; on the
			// ground it must stop short of the terrace, which is open floor.
			const reach = outer
				? stretch.halfWidth + capRadius + rng.NextNumber(0, 25)
				: stretch.halfWidth + capRadius * (stretch.floorY > 0 ? rng.NextNumber(0.15, 0.5) : rng.NextNumber(1.05, 1.3));
			const x = side * math.min(reach, meadowHalf - capRadius * 0.8);
			const z = settle(
				stretch.z + rng.NextNumber(-0.4, 0.4) * stretch.depth,
				zMin + capRadius * 0.5,
				zMax - capRadius * 0.5,
			);
			if (height < 3) return;
			const base = new Vector3(x, 0, z);
			const dome = hill(group, base, capRadius, height, HILL_GREENS[rng.NextInteger(0, HILL_GREENS.size() - 1)]);
			if (!allClear([dome], keepOut)) continue;
			parts.push(dome);

			if (rng.NextNumber() < 0.45) {
				const angle = rng.NextNumber(0, 2 * math.pi);
				const offset = rng.NextNumber(0, 0.4) * capRadius;
				const surface = hillSurface(capRadius, height, offset);
				if (surface === undefined) return;
				const at = base.add(new Vector3(math.cos(angle) * offset, surface - 0.3, math.sin(angle) * offset));
				const crown = tree(group, at, rng.NextNumber(1, 1.4), rng);
				if (allClear(crown, keepOut)) for (const part of crown) parts.push(part);
			}
			return;
		}
	};
	for (const stretch of stretches) {
		for (const side of [-1, 1]) {
			placeHill(stretch, side, false);
			placeHill(stretch, side, true);
		}
	}
	return parts;
}

/**
 * Every Part of the Grassland, in build order: each terrace's dressing,
 * bottom first, then the meadow around them. Deterministic, and no solid
 * part enters a keep-clear box.
 */
export function planGrassland(layout: GrasslandLayout): PartSpec[] {
	if (layout.terraces.size() === 0) return [];
	const keepClear = [...layout.clearZones, ...extraClearZones(layout)];
	const parts: PartSpec[] = [];
	layout.terraces.forEach((terrace, i) => {
		for (const part of dressTerrace(i, terrace, keepClear)) parts.push(part);
	});
	for (const part of dressMeadow(layout, [...keepClear, ...terraceTops(layout)])) parts.push(part);
	return parts;
}
