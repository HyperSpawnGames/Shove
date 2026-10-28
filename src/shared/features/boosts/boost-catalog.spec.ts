import { describe, expect, it } from "@rbxts/jest-globals";
import {
	buyPrice,
	canWear,
	findOutline,
	findPower,
	fitsSizeCap,
	nextTier,
	OUTLINES,
	POWERS,
	SIZES,
} from "./boost-catalog";

describe("the ladders", () => {
	it("get dearer and stronger at every tier", () => {
		for (let i = 1; i < OUTLINES.size(); i++) {
			expect(OUTLINES[i].price).toBeGreaterThan(OUTLINES[i - 1].price);
			expect(OUTLINES[i].bonusPerRep).toBeGreaterThan(OUTLINES[i - 1].bonusPerRep);
		}
		for (let i = 1; i < POWERS.size(); i++) {
			expect(POWERS[i].price).toBeGreaterThan(POWERS[i - 1].price);
			expect(POWERS[i].multiplier).toBeGreaterThan(POWERS[i - 1].multiplier);
		}
	});

	it("never shrink Strength", () => {
		for (const power of POWERS) expect(power.multiplier).toBeGreaterThan(1);
		for (const outline of OUTLINES) expect(outline.bonusPerRep).toBeGreaterThan(0);
	});

	it("give every tier its own id", () => {
		const ids = new Set<string>();
		for (const tier of [...OUTLINES, ...POWERS, ...SIZES]) ids.add(tier.id);
		expect(ids.size()).toBe(OUTLINES.size() + POWERS.size() + SIZES.size());
		expect(findOutline("Gold")?.bonusPerRep).toBe(250);
		expect(findPower("Ember")?.multiplier).toBe(2);
		expect(findOutline("Ember")).toBe(undefined);
	});
});

describe("nextTier", () => {
	it("is the first tier not yet bought", () => {
		expect(nextTier("outline", {})?.id).toBe(OUTLINES[0].id);
		expect(nextTier("power", { [POWERS[0].id]: true })?.id).toBe(POWERS[1].id);
	});

	it("is undefined once the whole ladder is bought", () => {
		const all: { [id: string]: boolean } = {};
		for (const tier of POWERS) all[tier.id] = true;
		expect(nextTier("power", all)).toBe(undefined);
	});
});

describe("buyPrice", () => {
	const first = OUTLINES[0];
	const second = OUTLINES[1];

	it("sells the next tier to a player who can afford it", () => {
		expect(buyPrice("outline", first.id, {}, first.price)).toBe(first.price);
		expect(buyPrice("outline", second.id, { [first.id]: true }, second.price)).toBe(second.price);
	});

	it("refuses a player who cannot afford it", () => {
		expect(buyPrice("outline", first.id, {}, first.price - 1)).toBe(undefined);
	});

	it("refuses skipping a tier, buying one twice, or an unknown id", () => {
		expect(buyPrice("outline", second.id, {}, math.huge)).toBe(undefined);
		expect(buyPrice("outline", first.id, { [first.id]: true }, math.huge)).toBe(undefined);
		expect(buyPrice("outline", "Nope", {}, math.huge)).toBe(undefined);
		expect(buyPrice("power", first.id, {}, math.huge)).toBe(undefined);
	});
});

describe("canWear", () => {
	it("allows a tier bought, or none", () => {
		expect(canWear("Gold", { Gold: true })).toBe(true);
		expect(canWear("", {})).toBe(true);
	});

	it("refuses a tier not bought", () => {
		expect(canWear("Gold", {})).toBe(false);
		expect(canWear("Gold", { Gold: false })).toBe(false);
	});
});

describe("sizes", () => {
	it("grow and multiply more at every tier", () => {
		for (let i = 1; i < SIZES.size(); i++) {
			expect(SIZES[i].price).toBeGreaterThan(SIZES[i - 1].price);
			expect(SIZES[i].multiplier).toBeGreaterThan(SIZES[i - 1].multiplier);
			expect(SIZES[i].scale).toBeGreaterThan(SIZES[i - 1].scale);
		}
		for (const size of SIZES) expect(size.scale > 1 && size.multiplier > 1).toBe(true);
	});

	it("cannot be bought bigger than the size cap", () => {
		const first = SIZES[0];
		expect(buyPrice("size", first.id, {}, math.huge, first.scale)).toBe(first.price);
		expect(buyPrice("size", first.id, {}, math.huge, first.scale - 0.01)).toBe(undefined);
		expect(fitsSizeCap(first, first.scale - 0.01)).toBe(false);
	});

	it("never caps outlines or powers", () => {
		expect(buyPrice("power", POWERS[0].id, {}, math.huge, 0)).toBe(POWERS[0].price);
		expect(fitsSizeCap(OUTLINES[0], 0)).toBe(true);
	});
});
