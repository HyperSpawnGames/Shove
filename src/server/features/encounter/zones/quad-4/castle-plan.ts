import type { TerraceLayout } from "../../world-layout";
import type { ClearZone } from "../types";
import { Box, boundsOf, boxesOverlap, Piece, planGap, seededRandom } from "./castle-geometry";
import {
	bannerPole,
	barrels,
	brazier,
	DARK_STONE,
	gateway,
	hayBales,
	PARAPET_HEIGHT,
	STONE,
	wallRun,
	watchtower,
	weaponRack,
} from "./castle-props";

/**
 * Where the castle's props go on one terrace: watchtowers on the corners,
 * crenellated walls down both sides and across the front, a gateway over
 * the lane, and banners, braziers and clutter along the inside of the side
 * walls. Every candidate is checked against the keep-clear boxes and dropped
 * if it would intrude, so the guarantee holds for any terrace size.
 */

/** Parts per terrace: four terraces stay within a zone's 600. */
export const TERRACE_PART_BUDGET = 150;
/** Seen from above, the least room between a collidable piece and a keep-clear box at its height. */
export const PLAN_MARGIN = 1;
/** Half the gateway's opening: the lane is RAMP_WIDTH + 4 = 20 studs wide, plus two studs each side. */
export const GATE_INNER_HALF = 12;
/** The lock wall fills a terrace's front stud; the castle starts behind it. */
const GATE_DEPTH = 1.5;
/** Props along each side wall, at most: what the budget leaves after the walls, towers and gateway. */
const SIDE_SLOTS = 5;
/** The terrace width at which props are drawn at scale 1: about a quad 4 terrace. */
const REFERENCE_WIDTH = 110;

/** How big this terrace's props are drawn. */
export function zoneScale(layout: TerraceLayout): number {
	return layout.width / REFERENCE_WIDTH;
}

/** The look of the castle terrace at `index` (bottom first): cobblestone and slate, alternating. */
export function terraceStyle(index: number): { color: Color3; material: Enum.Material } {
	return index % 2 === 0
		? { color: STONE, material: Enum.Material.Cobblestone }
		: { color: DARK_STONE, material: Enum.Material.Slate };
}

function zoneBox(zone: ClearZone): Box {
	return boundsOf(zone.cframe, zone.size);
}

/** Whether `box` stays out of `zone`: no shared volume, and a margin around it at its height. */
export function keepsClear(box: Box, zone: Box): boolean {
	if (boxesOverlap(box, zone)) return false;
	const atItsHeight = box.min.Y < zone.max.Y && box.max.Y > zone.min.Y;
	return !atItsHeight || planGap(box, zone) >= PLAN_MARGIN;
}

/** Whether `box` lies on the terrace's footprint, seen from above. */
export function onTerrace(box: Box, layout: TerraceLayout): boolean {
	const half = layout.width / 2 + 0.01;
	return (
		box.min.X >= -half && box.max.X <= half && box.min.Z >= layout.backZ - 0.01 && box.max.Z <= layout.frontZ + 0.01
	);
}

/** A side of the lane: -1 is -X, 1 is +X. */
type Side = -1 | 1;

/** A free-standing prop's origin on side `side`: its local +X turned to face the lane. */
function facingLane(x: number, y: number, z: number, side: Side): CFrame {
	return new CFrame(x, y, z).mul(CFrame.Angles(0, side > 0 ? math.pi : 0, 0));
}

/** The castle props for one terrace, deterministic for a given `seed`. */
export function planCastleTerrace(layout: TerraceLayout, clearZones: readonly ClearZone[], seed: number): Piece[] {
	const u = zoneScale(layout);
	const random = seededRandom(seed);
	const zones = clearZones.map(zoneBox);
	const half = layout.width / 2;
	const y = layout.floorY;
	const wall = 3 * u;
	const radius = 4.5 * u;
	const towerFrontZ = layout.frontZ - GATE_DEPTH - radius;
	const towerBackZ = layout.backZ + radius;

	const placed: Piece[] = [];
	/** Collidable boxes of the free-standing props, which keep their distance from one another. */
	const loose: Box[] = [];

	const tryPlace = (pieces: Piece[], freeStanding: boolean): boolean => {
		if (placed.size() + pieces.size() > TERRACE_PART_BUDGET) return false;
		const solid: Box[] = [];
		for (const p of pieces) {
			const box = boundsOf(p.cframe, p.size);
			if (!onTerrace(box, layout)) return false;
			if (!p.collidable) continue;
			if (!zones.every((zone) => keepsClear(box, zone))) return false;
			if (freeStanding && loose.some((other) => planGap(box, other) < PLAN_MARGIN)) return false;
			solid.push(box);
		}
		for (const p of pieces) placed.push(p);
		if (freeStanding) for (const box of solid) loose.push(box);
		return true;
	};

	// The flagstone path up the lane: flush with the floor, so never in the way.
	placed.push({
		name: "Flagstones",
		size: new Vector3(16, 0.2, layout.frontZ - layout.backZ),
		cframe: new CFrame(0, y - 0.05, (layout.frontZ + layout.backZ) / 2),
		color: DARK_STONE,
		material: Enum.Material.Slate,
		collidable: false,
	});

	const sides: Side[] = [-1, 1];
	for (const side of sides) {
		const x = side * (half - radius);
		tryPlace(watchtower(new Vector3(x, y, towerFrontZ), radius, u), false);
		tryPlace(watchtower(new Vector3(x, y, towerBackZ), radius, u), false);
	}
	for (const side of sides) {
		const x = side * (half - wall / 2);
		tryPlace(wallRun(new Vector3(x, y, towerFrontZ), new Vector3(x, y, towerBackZ), u), false);
	}

	// The gateway, its lintel well above the lane, and a low crenellated parapet either side of it,
	// so a player on the ramp below sees the terrace floor over it as they climb.
	const clearance = math.max(16, 17 * u);
	const gateZ = layout.frontZ - GATE_DEPTH - wall / 2;
	tryPlace(gateway(new Vector3(0, y, gateZ), GATE_INNER_HALF, clearance, u), false);
	const curtainFrom = GATE_INNER_HALF + 4 * u;
	for (const side of sides) {
		const from = new Vector3(side * curtainFrom, y, gateZ);
		const to = new Vector3(side * (half - radius), y, gateZ);
		tryPlace(wallRun(from, to, u, PARAPET_HEIGHT, "Parapet"), false);
	}
	for (const side of sides) {
		const at = facingLane(side * (curtainFrom + 2.5 * u), y, gateZ - wall / 2 - 2.5 * u, side);
		tryPlace(brazier(at, u), true);
	}

	// Along the inside of each side wall, mirrored: banner, clutter, brazier, clutter, ...
	const firstZ = towerFrontZ - radius - 3 * u;
	const lastZ = towerBackZ + radius + 3 * u;
	const span = firstZ - lastZ;
	const count = span > 0 ? math.min(SIDE_SLOTS, math.floor(span / (10 * u)) + 1) : 0;
	for (let i = 0; i < count; i++) {
		const z = count === 1 ? firstZ : firstZ - (span * i) / (count - 1);
		const roll = random();
		const extra = random();
		const pair = sides.map((side) => {
			const inset = half - wall;
			const kind = i % 4;
			if (kind === 0) return bannerPole(facingLane(side * (inset - 4 * u), y, z, side), u);
			const at = facingLane(side * (inset - 3 * u), y, z, side);
			if (kind === 2) return brazier(at, u);
			if (roll < 0.34) return weaponRack(at, u);
			if (roll < 0.67) return barrels(at, u, extra < 0.5 ? 2 : 3);
			return hayBales(at, u, extra < 0.5);
		});
		// Both sides or neither, so the budget never leaves the courtyard lopsided.
		if (placed.size() + pair[0].size() + pair[1].size() > TERRACE_PART_BUDGET) continue;
		for (const pieces of pair) tryPlace(pieces, true);
	}
	return placed;
}
