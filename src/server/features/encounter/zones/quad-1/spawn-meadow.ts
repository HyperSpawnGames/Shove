import type { TerraceLayout } from "../../world-layout";
import type { ClearZone } from "../types";
import { allClear, PartSpec } from "./part-spec";
import { bush, flowers, HILL_GREENS, hill, PROP_RADIUS, rock, tree } from "./props";

/** The spawn meadow's own part budget, on top of the Grassland's. */
export const SPAWN_MEADOW_PART_BUDGET = 260;
/** Same seed, same meadow. */
const SEED = 4242;
/** The spawn pad sits at the origin; keep this much room around it. */
const SPAWN_CLEAR_HALF = 16;
/** How far the meadow reaches toward the spawn's back and either side. */
const MEADOW_BACK_Z = 150;
const MEADOW_HALF_X = 170;
/** Half the width of the walk from the spawn to the first giant. */
const PATH_HALF = 4.5;

/** Boxes the spawn meadow keeps free: the spawn pad and the walk from it to the first terrace. */
export function spawnClearZones(first: TerraceLayout): ClearZone[] {
	const walkLength = SPAWN_CLEAR_HALF - first.frontZ;
	return [
		{
			cframe: new CFrame(0, 6, 0),
			size: new Vector3(2 * SPAWN_CLEAR_HALF, 12, 2 * SPAWN_CLEAR_HALF),
		},
		{
			cframe: new CFrame(0, 6, (SPAWN_CLEAR_HALF + first.frontZ) / 2),
			size: new Vector3(2 * PATH_HALF + 8, 12, walkLength),
		},
	];
}

/**
 * The grass around the spawn, so the first thing a player sees is already
 * the Grassland: a ring of wildflowers round
 * the spawn pad, trees, bushes and rocks scattered on the open grass, and
 * low hills along the far edges. Deterministic; nothing solid enters
 * `keepClear` (the spawn and the walk to the climb are added to it), and the
 * meadow stays in front of the first terrace.
 */
export function planSpawnMeadow(first: TerraceLayout, keepClear: readonly ClearZone[]): PartSpec[] {
	const rng = new Random(SEED);
	const group = "SpawnMeadow";
	const zones = [...keepClear, ...spawnClearZones(first)];
	const parts: PartSpec[] = [];
	const taken: { at: Vector3; radius: number }[] = [];
	const free = (at: Vector3, radius: number) =>
		taken.every((other) => other.at.sub(at).Magnitude >= other.radius + radius + 1);

	const place = (count: number, radius: number, spot: () => Vector3, make: (at: Vector3) => PartSpec[]) => {
		let placed = 0;
		for (let attempt = 0; attempt < count * 25 && placed < count; attempt++) {
			const at = spot();
			// The first terrace starts just behind the spawn; the meadow stays in front of it.
			if (at.Z - radius - 2 < first.frontZ || !free(at, radius)) continue;
			const prop = make(at);
			if (parts.size() + prop.size() > SPAWN_MEADOW_PART_BUDGET || !allClear(prop, zones)) continue;
			for (const part of prop) parts.push(part);
			taken.push({ at, radius });
			placed += 1;
		}
	};
	// Anywhere on the open grass in front of the climb.
	const open = () =>
		new Vector3(rng.NextNumber(-MEADOW_HALF_X, MEADOW_HALF_X), 0, rng.NextNumber(first.frontZ + 6, MEADOW_BACK_Z));
	// A ring just outside the spawn pad.
	const ring = () => {
		const angle = rng.NextNumber(0, 2 * math.pi);
		const distance = rng.NextNumber(SPAWN_CLEAR_HALF + 2, SPAWN_CLEAR_HALF + 7);
		return new Vector3(math.cos(angle) * distance, 0, math.sin(angle) * distance);
	};
	// Along the far left and right edges, where hills frame the view without closing it in.
	const edge = () =>
		new Vector3(
			(rng.NextNumber() < 0.5 ? -1 : 1) * rng.NextNumber(MEADOW_HALF_X - 40, MEADOW_HALF_X),
			0,
			rng.NextNumber(first.frontZ + 20, MEADOW_BACK_Z),
		);

	place(6, 34, edge, (at) => [
		hill(group, at, rng.NextNumber(24, 34), rng.NextNumber(6, 10), HILL_GREENS[rng.NextInteger(0, 2)]),
	]);
	place(10, PROP_RADIUS.flowers, ring, (at) => flowers(group, at, 1, rng, rng.NextNumber() < 0.3));
	place(14, PROP_RADIUS.tree, open, (at) => tree(group, at, 1.2, rng));
	place(12, PROP_RADIUS.bush, open, (at) => bush(group, at, 1, rng));
	place(10, PROP_RADIUS.rock, open, (at) => rock(group, at, 1, rng));
	place(30, PROP_RADIUS.flowers, open, (at) => flowers(group, at, 1, rng, rng.NextNumber() < 0.15));
	return parts;
}
