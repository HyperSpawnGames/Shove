/**
 * The staircase as numbers, built along -Z away from the spawn at the origin.
 * It is a row of slots: each quad's giants, one terrace each, then an empty
 * spacer terrace before the next quad. Slot 0 is the ground the player spawns
 * on; every later slot is a raised block, higher than the last, reached by a
 * ramp from the back of the one below. A terrace is sized from its giant, so
 * the world grows with the giants rather than with the slot count. Combat
 * happens in private arenas, so terraces only need room to walk, train,
 * dress the zone and reach the giant.
 */
export interface TerraceLayout {
	/** Height of the walkable top. */
	floorY: number;
	/** Z of the edge facing the spawn, and of the far edge (frontZ > backZ). */
	frontZ: number;
	backZ: number;
	width: number;
	/** Where the giant's pedestal stands, on the floor (the middle, for a spacer). */
	giantPosition: Vector3;
}

export interface RampLayout {
	/** Bottom of the ramp, on the lower terrace's back edge. */
	from: Vector3;
	/** Top of the ramp, on the upper terrace's front edge. */
	to: Vector3;
}

/** A place on the staircase: a giant's terrace, or the empty spacer after a quad. */
export type StairSlot =
	| { kind: "giant"; giantIndex: number; quadIndex: number }
	| { kind: "spacer"; quadIndex: number; giantsBefore: number };

/** How much floor a terrace needs. */
export interface Footprint {
	depth: number;
	width: number;
}

export const FIRST_FRONT_Z = -10;
export const RISE_PER_SLOT = 20;
export const RAMP_RUN = 40;
/** How far into a terrace, as a share of its depth, the giant stands. */
export const GIANT_DEPTH_SHARE = 0.55;
/** The empty terrace between quads: a breather, and room for what comes later. */
export const SPACER_FOOTPRINT: Footprint = { depth: 40, width: 50 };

/** Floor for a giant of `scale`: room for its pedestal, the challenger and the zone's dressing. */
export function giantFootprint(scale: number): Footprint {
	return { depth: 40 + 10 * scale, width: 50 + 12 * scale };
}

/**
 * The slots for quads holding `quadSizes` giants each, in order. A quad with
 * no giants yet takes no room; a spacer follows every quad that has giants,
 * except the last one built.
 */
export function planSlots(quadSizes: readonly number[]): StairSlot[] {
	const slots: StairSlot[] = [];
	let giantIndex = 0;
	quadSizes.forEach((size, quadIndex) => {
		if (size <= 0) return;
		if (slots.size() > 0) slots.push({ kind: "spacer", quadIndex: quadIndex - 1, giantsBefore: giantIndex });
		for (let i = 0; i < size; i++) {
			slots.push({ kind: "giant", giantIndex, quadIndex });
			giantIndex += 1;
		}
	});
	return slots;
}

/** Lays the slots out back to back, each a rise above and a ramp run behind the last. */
export function layoutTerraces(footprints: readonly Footprint[]): TerraceLayout[] {
	const layouts: TerraceLayout[] = [];
	let frontZ = FIRST_FRONT_Z;
	footprints.forEach((footprint, slot) => {
		const floorY = RISE_PER_SLOT * slot;
		layouts.push({
			floorY,
			frontZ,
			backZ: frontZ - footprint.depth,
			width: footprint.width,
			giantPosition: new Vector3(0, floorY, frontZ - footprint.depth * GIANT_DEPTH_SHARE),
		});
		frontZ -= footprint.depth + RAMP_RUN;
	});
	return layouts;
}

/** The ramp from the back of `lower` up to the front of `upper`. */
export function rampBetween(lower: TerraceLayout, upper: TerraceLayout): RampLayout {
	return {
		from: new Vector3(0, lower.floorY, lower.backZ),
		to: new Vector3(0, upper.floorY, upper.frontZ),
	};
}

/** Giants a player must have cleared to stand on slot `slot`. */
function clearedNeededFor(slot: StairSlot): number {
	return slot.kind === "giant" ? slot.giantIndex : slot.giantsBefore;
}

/**
 * The HighestCleared value that opens the ramp up to slot `index`, or
 * undefined when that ramp needs no gate: the ramp into a spacer opens with
 * the quad's last giant, and the ramp out of a spacer is already open.
 */
export function gateOpensAt(slots: readonly StairSlot[], index: number): number | undefined {
	if (index <= 0) return undefined;
	const needed = clearedNeededFor(slots[index]);
	return needed > clearedNeededFor(slots[index - 1]) ? needed : undefined;
}

/** Studs above a terrace's floor that still count as standing on it (a jump, a body's height). */
export const STANDING_HEIGHT = 12;

/** Whether `position` is over `layout`'s walkable top and no higher than a jump above it. */
export function standingOn(position: Vector3, layout: TerraceLayout): boolean {
	return (
		math.abs(position.X) <= layout.width / 2 &&
		position.Z <= layout.frontZ &&
		position.Z >= layout.backZ &&
		position.Y >= layout.floorY - 1 &&
		position.Y <= layout.floorY + STANDING_HEIGHT
	);
}

/**
 * Where a body respawns on a checkpoint terrace: its middle, `rootHeight`
 * above the floor, facing up the staircase.
 */
export function checkpointSpawn(layout: TerraceLayout, rootHeight: number): CFrame {
	const middle = new Vector3(0, layout.floorY + rootHeight, (layout.frontZ + layout.backZ) / 2);
	return CFrame.lookAt(middle, middle.add(new Vector3(0, 0, -1)));
}
