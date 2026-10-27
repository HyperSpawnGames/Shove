import { describe, expect, it } from "@rbxts/jest-globals";
import { QUAD_5 } from "./quad-5-frost";
import { tierTuning } from "./tuning";

describe("QUAD_5", () => {
	it("has the four Frost giants in climbing order", () => {
		const ids = QUAD_5.giants.map((giant) => giant.modelId);
		expect(ids).toEqual(["WinterAssassin", "FrostMage", "IceKing", "YetiWarlord"]);
	});

	it("climbs strictly in scale, strength and payout from the last Castle giant", () => {
		let previous: { scale: number; recommendedStrength: number; winsPayout: number } = tierTuning(15);
		for (const giant of QUAD_5.giants) {
			expect(giant.scale).toBeGreaterThan(previous.scale);
			expect(giant.recommendedStrength).toBeGreaterThan(previous.recommendedStrength);
			expect(giant.winsPayout).toBeGreaterThan(previous.winsPayout);
			previous = giant;
		}
	});

	it("gives every giant a surge style within the brief's ranges", () => {
		for (const giant of QUAD_5.giants) {
			const surge = giant.surge;
			expect(surge).toBeDefined();
			if (surge === undefined) continue;
			const minGap = surge.minGap ?? 0;
			const maxGap = surge.maxGap ?? 0;
			expect(minGap).toBeGreaterThanOrEqual(1);
			expect(minGap).toBeLessThanOrEqual(5);
			expect(maxGap).toBeGreaterThanOrEqual(minGap);
			expect(maxGap).toBeLessThanOrEqual(6);
			expect(surge.warning ?? 0).toBeGreaterThanOrEqual(0.4);
			expect(surge.warning ?? 0).toBeLessThanOrEqual(1.2);
			expect(surge.duration ?? 0).toBeGreaterThanOrEqual(0.25);
			expect(surge.duration ?? 0).toBeLessThanOrEqual(0.6);
			expect(surge.share ?? 0).toBeGreaterThanOrEqual(0.5);
			expect(surge.share ?? 0).toBeLessThanOrEqual(0.9);
		}
	});
});
