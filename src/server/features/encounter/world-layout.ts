/**
 * The staircase of terraces as numbers, built along -Z away from the spawn at
 * the origin. Terrace 0 is the ground the player spawns on; each later one is
 * a raised block, higher, wider and deeper than the last, reached by a ramp
 * from the back of the one below. Combat happens in private arenas, so the
 * terraces only need room to walk, train and reach the giant.
 */
export interface TerraceLayout {
	/** Height of the walkable top. */
	floorY: number;
	/** Z of the edge facing the spawn, and of the far edge (frontZ > backZ). */
	frontZ: number;
	backZ: number;
	width: number;
	/** Where the giant's pedestal stands, on the floor. */
	giantPosition: Vector3;
}

export interface RampLayout {
	/** Bottom of the ramp, on the lower terrace's back edge. */
	from: Vector3;
	/** Top of the ramp, on the upper terrace's front edge. */
	to: Vector3;
}

export const FIRST_FRONT_Z = -10;
export const BASE_DEPTH = 50;
export const DEPTH_PER_TIER = 20;
export const BASE_WIDTH = 60;
export const WIDTH_PER_TIER = 20;
export const RISE_PER_TIER = 24;
export const RAMP_RUN = 40;
/** How far into a terrace, as a share of its depth, the giant stands. */
export const GIANT_DEPTH_SHARE = 0.55;

export function terraceLayout(tier: number): TerraceLayout {
	let frontZ = FIRST_FRONT_Z;
	for (let below = 0; below < tier; below++) frontZ -= BASE_DEPTH + DEPTH_PER_TIER * below + RAMP_RUN;

	const depth = BASE_DEPTH + DEPTH_PER_TIER * tier;
	const floorY = RISE_PER_TIER * tier;
	return {
		floorY,
		frontZ,
		backZ: frontZ - depth,
		width: BASE_WIDTH + WIDTH_PER_TIER * tier,
		giantPosition: new Vector3(0, floorY, frontZ - depth * GIANT_DEPTH_SHARE),
	};
}

/** The ramp up to `tier` from the terrace below it. Tier 0 has none. */
export function rampLayout(tier: number): RampLayout | undefined {
	if (tier <= 0) return undefined;
	const lower = terraceLayout(tier - 1);
	const upper = terraceLayout(tier);
	return {
		from: new Vector3(0, lower.floorY, lower.backZ),
		to: new Vector3(0, upper.floorY, upper.frontZ),
	};
}
