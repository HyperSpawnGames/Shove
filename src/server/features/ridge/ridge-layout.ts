import { Box } from "./box";
import { RidgeConfig } from "./ridge-config";

/**
 * The ridge as plain data: where every block, zone, ramp and mark sits. The
 * valley floor is y = valleyY, the ridge climbs along +Z, and ±X is the combat
 * axis (player at −X, giant at +X, giants thrown toward +X).
 */
export interface RidgeLayout {
	readonly valleyY: number;
	/** The floor under the whole ridge, with margin on every side. */
	readonly valley: Box;
	/** Index 0 is the base; 1..terraceCount are the giant terraces. */
	readonly terraces: readonly Terrace[];
}

export interface Terrace {
	/** 0 for the base. */
	readonly index: number;
	/** Scale of a player arriving at the intended size. */
	readonly arrivalScale: number;
	/** Height in studs of that player: the unit every dimension is built from. */
	readonly arrivalHeight: number;
	readonly topY: number;
	readonly frontZ: number;
	readonly backZ: number;
	readonly width: number;
	/** The solid block from the valley floor to just under the surface. */
	readonly block: Box;
	/** Surface slabs, front to back; together they cover the whole top. */
	readonly arrival: Box;
	readonly shops?: Box;
	readonly fight?: Fight;
	readonly back: Box;
	/** Feet position at the centre of the arrival zone; face +Z. */
	readonly arrivalPoint: Vector3;
	/** Arms, Aura, Eggs, in that order; empty when the terrace has no shops. */
	readonly shopStands: readonly Box[];
	/** The wedge up to the next terrace, rising toward +Z. Absent on the summit. */
	readonly ramp?: Box;
	/** A marker across the top of the ramp, standing on the next terrace. */
	readonly barrier?: Box;
	/** Feet positions of the 1× lamp posts along both cliff edges. */
	readonly posts: readonly Vector3[];
}

export interface Fight {
	readonly lane: Box;
	readonly playerMark: Vector3;
	readonly giantMark: Vector3;
	readonly giantHeight: number;
	/**
	 * Sideways distance from the giant's mark to where a thrown giant comes
	 * back down to the lane's height: throwClearance giant heights past the
	 * +X cliff edge.
	 */
	readonly throwDistance: number;
}

/** Thickness of the surface slabs laid over each block. */
export const SURFACE_THICKNESS = 1;

/** True for terraces that carry a shop strip (the base always does). */
export function hasShops(config: RidgeConfig, index: number): boolean {
	return index === 0 || (index > 1 && (index - 1) % config.shopEvery === 0);
}

/** Scale of a player arriving at the intended size; the base counts as 1×. */
export function arrivalScale(config: RidgeConfig, index: number): number {
	return index <= 1 ? 1 : config.growth ** (index - 1);
}

function slab(width: number, topY: number, fromZ: number, toZ: number): Box {
	return {
		center: new Vector3(0, topY - SURFACE_THICKNESS / 2, (fromZ + toZ) / 2),
		size: new Vector3(width, SURFACE_THICKNESS, toZ - fromZ),
	};
}

interface ZoneDepths {
	readonly arrival: number;
	readonly shops: number;
	readonly fight: number;
	/** Holds the ramp; flat summit ground on the last terrace. */
	readonly back: number;
}

/** Depths in studs of a terrace's zones, front to back. */
function zoneDepths(config: RidgeConfig, index: number): ZoneDepths {
	const h = config.playerHeight * arrivalScale(config, index);
	const isBase = index === 0;
	const rampRun = config.stepHeight / math.tan(math.rad(config.rampSlopeDegrees));
	return {
		arrival: (isBase ? config.baseSpawnDepth : config.arrivalDepth) * h,
		shops: hasShops(config, index) ? config.shopDepth * h : 0,
		fight: isBase ? 0 : config.fightDepth * h,
		back: rampRun * h,
	};
}

function layoutTerrace(config: RidgeConfig, index: number, frontZ: number, topY: number, valleyY: number): Terrace {
	const scale = arrivalScale(config, index);
	const h = config.playerHeight * scale;
	const isSummit = index === config.terraceCount;
	const width = index === 0 ? config.baseWidth * config.playerHeight : config.terraceWidth * h;
	const { arrival: arrivalDepth, shops: shopDepth, fight: fightDepth, back: backDepth } = zoneDepths(config, index);

	const arrivalEnd = frontZ + arrivalDepth;
	const shopEnd = arrivalEnd + shopDepth;
	const fightEnd = shopEnd + fightDepth;
	const backZ = fightEnd + backDepth;

	const shopStands: Box[] = [];
	if (shopDepth > 0) {
		const standSize = new Vector3(1.2 * h, 1.2 * h, 1.2 * h);
		for (const x of [-width / 4, 0, width / 4]) {
			shopStands.push({ center: new Vector3(x, topY + standSize.Y / 2, (arrivalEnd + shopEnd) / 2), size: standSize });
		}
	}

	let fight: Fight | undefined;
	if (fightDepth > 0) {
		const laneZ = (shopEnd + fightEnd) / 2;
		const giantHeight = config.giantToPlayer * h;
		fight = {
			lane: slab(width, topY, shopEnd, fightEnd),
			playerMark: new Vector3(-config.fighterOffset * h, topY, laneZ),
			giantMark: new Vector3(config.fighterOffset * h, topY, laneZ),
			giantHeight,
			throwDistance: width / 2 - config.fighterOffset * h + config.throwClearance * giantHeight,
		};
	}

	let ramp: Box | undefined;
	let barrier: Box | undefined;
	if (!isSummit) {
		const riser = config.stepHeight * h;
		ramp = {
			center: new Vector3(0, topY + riser / 2, backZ - backDepth / 2),
			size: new Vector3(config.rampWidth * h, riser, backDepth),
		};
		const thickness = 0.2 * h;
		barrier = {
			center: new Vector3(0, topY + riser + 0.75 * h, backZ + thickness / 2),
			size: new Vector3(config.rampWidth * h, 1.5 * h, thickness),
		};
	}

	const posts: Vector3[] = [];
	const spacing = config.postSpacing * h;
	const postX = width / 2 - 1;
	for (let z = frontZ + spacing / 2; z < backZ; z += spacing) {
		posts.push(new Vector3(-postX, topY, z), new Vector3(postX, topY, z));
	}

	const blockTop = topY - SURFACE_THICKNESS;
	return {
		index,
		arrivalScale: scale,
		arrivalHeight: h,
		topY,
		frontZ,
		backZ,
		width,
		block: {
			center: new Vector3(0, (valleyY + blockTop) / 2, (frontZ + backZ) / 2),
			size: new Vector3(width, blockTop - valleyY, backZ - frontZ),
		},
		arrival: slab(width, topY, frontZ, arrivalEnd),
		shops: shopDepth > 0 ? slab(width, topY, arrivalEnd, shopEnd) : undefined,
		fight,
		back: slab(width, topY, fightEnd, backZ),
		arrivalPoint: new Vector3(0, topY, (frontZ + arrivalEnd) / 2),
		shopStands,
		ramp,
		barrier,
		posts,
	};
}

/**
 * Lays out the base and every terrace. The base's top sits `cliffDrop` 1×
 * heights above the valley floor and ends at z = 0; each terrace starts where
 * the previous one ends, one riser (`stepHeight` of the previous terrace's
 * arrival heights) higher.
 */
export function layoutRidge(config: RidgeConfig, valleyY = 0): RidgeLayout {
	const base = zoneDepths(config, 0);
	const baseDepth = base.arrival + base.shops + base.fight + base.back;
	const baseTop = valleyY + config.cliffDrop * config.playerHeight;
	const terraces: Terrace[] = [layoutTerrace(config, 0, -baseDepth, baseTop, valleyY)];

	for (let index = 1; index <= config.terraceCount; index++) {
		const previous = terraces[index - 1];
		const topY = previous.topY + config.stepHeight * previous.arrivalHeight;
		terraces.push(layoutTerrace(config, index, previous.backZ, topY, valleyY));
	}

	const first = terraces[0];
	const last = terraces[terraces.size() - 1];
	const margin = last.width * 1.5;
	const floorThickness = 10;
	const valleyWidth = last.width + 2 * margin;
	const valleyDepth = last.backZ - first.frontZ + 2 * margin;
	return {
		valleyY,
		valley: {
			center: new Vector3(0, valleyY - floorThickness / 2, (first.frontZ + last.backZ) / 2),
			size: new Vector3(valleyWidth, floorThickness, valleyDepth),
		},
		terraces,
	};
}

/**
 * The terrace whose footprint contains z: the base in front of the ridge, the
 * summit beyond it.
 */
export function terraceIndexAt(layout: RidgeLayout, z: number): number {
	const terraces = layout.terraces;
	for (const terrace of terraces) {
		if (z < terrace.backZ) return terrace.index;
	}
	return terraces[terraces.size() - 1].index;
}
