import { describe, expect, it } from "@rbxts/jest-globals";
import { QUAD_2 } from "./quad-2-desert";

describe("QUAD_2", () => {
	const giants = QUAD_2.giants;

	it("holds the four Desert giants in climbing order", () => {
		expect(giants.size()).toBe(4);
		expect(giants.map((giant) => giant.modelId)).toEqual(["Peasant", "SunGladiator", "SandMage", "DesertGeneral"]);
	});

	it("grows in scale, strength and payout from one giant to the next", () => {
		for (let i = 1; i < giants.size(); i++) {
			expect(giants[i].scale).toBeGreaterThan(giants[i - 1].scale);
			expect(giants[i].recommendedStrength).toBeGreaterThan(giants[i - 1].recommendedStrength);
			expect(giants[i].winsPayout).toBeGreaterThan(giants[i - 1].winsPayout);
		}
	});

	it("keeps every surge style within the brief's ranges", () => {
		for (const giant of giants) {
			const surge = giant.surge;
			expect(surge).toBeDefined();
			if (surge === undefined) continue;
			const minGap = surge.minGap ?? 0;
			const maxGap = surge.maxGap ?? minGap;
			expect(minGap >= 1 && minGap <= 5).toBe(true);
			expect(maxGap >= minGap && maxGap <= 5).toBe(true);
			const warning = surge.warning ?? 0;
			expect(warning >= 0.4 && warning <= 1.2).toBe(true);
			const duration = surge.duration ?? 0;
			expect(duration >= 0.25 && duration <= 0.6).toBe(true);
			const share = surge.share ?? 0;
			expect(share >= 0.5 && share <= 0.9).toBe(true);
		}
	});
});
