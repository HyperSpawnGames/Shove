/**
 * The three boost ladders the shop sells for Wins. Shared because the shop
 * renders every name, price, stat and colour; the server's rules read the
 * same entries, so a price shown is the price charged.
 *
 * Outlines add a set amount to every push-up's Strength. Powers and sizes
 * each multiply the player's whole Strength, in fights and on the HUD,
 * without changing what is saved; a size also grows the body. Each ladder is
 * bought in order; every tier bought is kept, and the player wears one of each.
 */
export type BoostKind = "outline" | "power" | "size";

export interface OutlineTier {
	id: string;
	name: string;
	price: number;
	/** Strength added to every push-up. */
	bonusPerRep: number;
	color: Color3;
}

export interface PowerTier {
	id: string;
	name: string;
	price: number;
	/** Multiplies the player's Strength. */
	multiplier: number;
	/** The shop swatch; the effect itself is drawn by each client (client/features/boosts/power-effects.ts). */
	color: Color3;
}

export interface SizeTier {
	id: string;
	name: string;
	price: number;
	/** Multiplies the player's Strength. */
	multiplier: number;
	/** How many times their own size the player grows. */
	scale: number;
	color: Color3;
}

export const OUTLINES: readonly OutlineTier[] = [
	{ id: "White", name: "White", price: 10, bonusPerRep: 1, color: Color3.fromRGB(255, 255, 255) },
	{ id: "Green", name: "Green", price: 60, bonusPerRep: 4, color: Color3.fromRGB(80, 230, 90) },
	{ id: "Blue", name: "Blue", price: 400, bonusPerRep: 15, color: Color3.fromRGB(60, 150, 255) },
	{ id: "Purple", name: "Purple", price: 3_000, bonusPerRep: 60, color: Color3.fromRGB(170, 80, 255) },
	{ id: "Gold", name: "Gold", price: 25_000, bonusPerRep: 250, color: Color3.fromRGB(255, 200, 40) },
	{ id: "Crimson", name: "Crimson", price: 200_000, bonusPerRep: 1_000, color: Color3.fromRGB(230, 30, 50) },
	{ id: "Cyan", name: "Cyan", price: 2_000_000, bonusPerRep: 5_000, color: Color3.fromRGB(40, 240, 240) },
	{ id: "Pink", name: "Pink", price: 20_000_000, bonusPerRep: 25_000, color: Color3.fromRGB(255, 90, 200) },
	{ id: "Onyx", name: "Onyx", price: 250_000_000, bonusPerRep: 125_000, color: Color3.fromRGB(20, 20, 30) },
	{ id: "Radiant", name: "Radiant", price: 3e9, bonusPerRep: 700_000, color: Color3.fromRGB(255, 250, 200) },
];

export const POWERS: readonly PowerTier[] = [
	{ id: "Spark", name: "Spark", price: 25, multiplier: 1.5, color: Color3.fromRGB(255, 240, 150) },
	{ id: "Ember", name: "Ember", price: 300, multiplier: 2, color: Color3.fromRGB(255, 120, 30) },
	{ id: "Frost", name: "Frost", price: 5_000, multiplier: 3, color: Color3.fromRGB(150, 220, 255) },
	{ id: "Storm", name: "Storm", price: 80_000, multiplier: 5, color: Color3.fromRGB(120, 140, 255) },
	{ id: "Venom", name: "Venom", price: 1_500_000, multiplier: 8, color: Color3.fromRGB(110, 255, 60) },
	{ id: "Shadow", name: "Shadow", price: 30_000_000, multiplier: 13, color: Color3.fromRGB(90, 30, 140) },
	{ id: "Cosmic", name: "Cosmic", price: 600_000_000, multiplier: 21, color: Color3.fromRGB(255, 80, 255) },
	{ id: "Void", name: "Void", price: 12e9, multiplier: 35, color: Color3.fromRGB(150, 60, 255) },
];

/**
 * Each size unlocks as the player reaches the giant it fits under: no tier is
 * bigger than SIZE_CAP_SHARE of the first giant not yet beaten. Scales follow
 * the roster's sizes (Noob 1.6x, then 2, 2.5, 3 and 5% more a giant).
 */
export const SIZES: readonly SizeTier[] = [
	{ id: "Grown", name: "Grown", price: 15, multiplier: 1.25, scale: 1.2, color: Color3.fromRGB(255, 225, 200) },
	{ id: "Big", name: "Big", price: 80, multiplier: 1.5, scale: 1.5, color: Color3.fromRGB(255, 205, 160) },
	{ id: "Large", name: "Large", price: 400, multiplier: 2, scale: 1.85, color: Color3.fromRGB(255, 180, 120) },
	{ id: "Huge", name: "Huge", price: 2_500, multiplier: 3, scale: 2.25, color: Color3.fromRGB(255, 155, 90) },
	{ id: "Hulking", name: "Hulking", price: 25_000, multiplier: 4, scale: 2.6, color: Color3.fromRGB(250, 130, 70) },
	{ id: "Massive", name: "Massive", price: 250_000, multiplier: 6, scale: 3, color: Color3.fromRGB(240, 105, 60) },
	{ id: "Towering", name: "Towering", price: 3e6, multiplier: 9, scale: 3.45, color: Color3.fromRGB(225, 80, 55) },
	{ id: "Colossal", name: "Colossal", price: 4e7, multiplier: 14, scale: 4, color: Color3.fromRGB(205, 60, 60) },
	{ id: "Titanic", name: "Titanic", price: 5e8, multiplier: 22, scale: 4.6, color: Color3.fromRGB(180, 45, 70) },
	{
		id: "Mountainous",
		name: "Mountainous",
		price: 8e9,
		multiplier: 35,
		scale: 5.4,
		color: Color3.fromRGB(150, 35, 85),
	},
	{
		id: "Gargantuan",
		name: "Gargantuan",
		price: 1.2e11,
		multiplier: 55,
		scale: 6.2,
		color: Color3.fromRGB(120, 30, 100),
	},
	{ id: "Mythic", name: "Mythic", price: 2e12, multiplier: 90, scale: 7.2, color: Color3.fromRGB(95, 30, 115) },
	{
		id: "Worldbreaker",
		name: "Worldbreaker",
		price: 3e13,
		multiplier: 150,
		scale: 8.4,
		color: Color3.fromRGB(70, 25, 130),
	},
];

/** No size may make the player bigger than this share of the first giant they have not beaten. */
export const SIZE_CAP_SHARE = 0.75;
/** The Player attribute the server sets to the largest scale the player may buy now. */
export const SIZE_CAP_ATTRIBUTE = "SizeCap";

/**
 * The attribute the server sets on a body to the id of the power it wears
 * (absent for none). Each client draws the power from it, so the animated
 * parts of an effect (lightning, flicker) cost the server nothing.
 */
export const POWER_ATTRIBUTE = "BoostPower";
/** The attribute the server sets on a body to the scale it was grown to (absent at 1x). */
export const SIZE_ATTRIBUTE = "BoostSize";

export type BoostTier = OutlineTier | PowerTier | SizeTier;

/** The ladder for `kind`, in the order it is bought. */
export function ladder(kind: BoostKind): readonly BoostTier[] {
	return kind === "outline" ? OUTLINES : kind === "power" ? POWERS : SIZES;
}

export function findOutline(id: string): OutlineTier | undefined {
	return OUTLINES.find((tier) => tier.id === id);
}

export function findPower(id: string): PowerTier | undefined {
	return POWERS.find((tier) => tier.id === id);
}

export function findSize(id: string): SizeTier | undefined {
	return SIZES.find((tier) => tier.id === id);
}

/** Tiers bought, by id. */
export type Owned = Readonly<{ [id: string]: boolean }>;

/** The tier of a ladder that is for sale: the first one not yet bought, or undefined once all are. */
export function nextTier(kind: BoostKind, owned: Owned): BoostTier | undefined {
	return ladder(kind).find((tier) => owned[tier.id] !== true);
}

/** Whether a tier fits under the size cap: always, unless it is a size bigger than `sizeCap`. */
export function fitsSizeCap(tier: BoostTier, sizeCap: number): boolean {
	return !("scale" in tier) || tier.scale <= sizeCap + 1e-9;
}

/**
 * The price of buying tier `id`, or undefined when it cannot be bought: it
 * is not the ladder's next tier (unknown, already bought, or skipping one),
 * it is a size bigger than `sizeCap`, or `wins` does not cover it.
 */
export function buyPrice(
	kind: BoostKind,
	id: string,
	owned: Owned,
	wins: number,
	sizeCap = math.huge,
): number | undefined {
	const tier = nextTier(kind, owned);
	if (tier === undefined || tier.id !== id || wins < tier.price || !fitsSizeCap(tier, sizeCap)) return undefined;
	return tier.price;
}

/** Whether tier `id` may be worn: one already bought, or "" to wear none. */
export function canWear(id: string, owned: Owned): boolean {
	return id === "" || owned[id] === true;
}
