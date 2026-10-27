import { describe, expect, it } from "@rbxts/jest-globals";
import { QUAD_4 } from "./quad-4-castle";
import { tierTuning } from "./tuning";

describe("QUAD_4", () => {
	it("holds the four Castle giants in climbing order", () => {
		const ids = QUAD_4.giants.map((giant) => giant.modelId);
		expect(ids).toEqual(["Archer", "Mage", "Knight", "Commander"]);
	});

	it("grows scale, strength and payout past the giant below it", () => {
		let previous = tierTuning(11);
		for (const giant of QUAD_4.giants) {
			expect(giant.scale).toBeGreaterThan(previous.scale);
			expect(giant.recommendedStrength).toBeGreaterThan(previous.recommendedStrength);
			expect(giant.winsPayout).toBeGreaterThan(previous.winsPayout);
			previous = giant;
		}
	});

	it("keeps every surge style within the brief's ranges", () => {
		for (const giant of QUAD_4.giants) {
			const surge = giant.surge;
			expect(surge).toBeDefined();
			if (surge === undefined) continue;
			const minGap = surge.minGap ?? 0;
			const maxGap = surge.maxGap ?? 0;
			const warning = surge.warning ?? 0;
			const duration = surge.duration ?? 0;
			const share = surge.share ?? 0;
			expect(minGap >= 1 && minGap <= 5).toBe(true);
			expect(maxGap >= minGap && maxGap <= 6).toBe(true);
			expect(warning >= 0.4 && warning <= 1.2).toBe(true);
			expect(duration >= 0.25 && duration <= 0.6).toBe(true);
			expect(share >= 0.5 && share <= 0.9).toBe(true);
		}
	});
});
