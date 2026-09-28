/**
 * Tunables for the ridge greybox (docs/superpowers/specs/2026-09-26-ridge-prototype-design.md).
 *
 * Terrace dimensions are in "arrival heights": multiples of the height of a
 * player arriving at that terrace at the intended size. Base dimensions are in
 * 1× heights.
 */
export interface RidgeConfig {
	/** One terrace per roster giant; terrace n shows the giant with RosterIndex n. */
	readonly terraceCount: number;
	/** Arrival-scale ratio between consecutive terraces. */
	readonly growth: number;
	/** Studs, a 1× avatar. */
	readonly playerHeight: number;
	/** Giant height ÷ arrival player height. */
	readonly giantToPlayer: number;
	readonly terraceWidth: number;
	readonly arrivalDepth: number;
	/** Added to shop terraces (and the base) for the shop strip. */
	readonly shopDepth: number;
	readonly fightDepth: number;
	/** The riser up to the next terrace. */
	readonly stepHeight: number;
	readonly rampSlopeDegrees: number;
	readonly rampWidth: number;
	/** From the fight lane's centre to each fighter's mark. */
	readonly fighterOffset: number;
	/** Terraces 1 + k·shopEvery (k ≥ 1) carry a shop strip; the base always does. */
	readonly shopEvery: number;
	readonly baseWidth: number;
	readonly baseSpawnDepth: number;
	/** 1× heights from the valley floor up to the base's top. */
	readonly cliffDrop: number;
	/** Arrival heights between the 1× lamp posts along each cliff edge. */
	readonly postSpacing: number;
	/** Giant heights past the +X cliff edge at which a thrown giant comes back down to the lane's height. */
	readonly throwClearance: number;
	/** Launch angle above the horizontal. */
	readonly throwAngleDegrees: number;
	/** Radians per second of tumble toward the cliff. */
	readonly throwSpin: number;
	/** Seconds before a thrown giant is replaced. */
	readonly throwResetAfter: number;
}

export const RIDGE_CONFIG: RidgeConfig = {
	terraceCount: 26,
	growth: 10 ** (1 / 25),
	playerHeight: 5,
	giantToPlayer: 2,
	terraceWidth: 12,
	arrivalDepth: 4,
	shopDepth: 4,
	fightDepth: 3,
	stepHeight: 2,
	rampSlopeDegrees: 30,
	rampWidth: 3,
	fighterOffset: 2,
	shopEvery: 4,
	baseWidth: 24,
	baseSpawnDepth: 6,
	cliffDrop: 12,
	postSpacing: 2,
	throwClearance: 1,
	throwAngleDegrees: 35,
	throwSpin: 1.5,
	throwResetAfter: 6,
};
