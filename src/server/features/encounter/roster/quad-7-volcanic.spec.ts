import { describe, expect, it } from "@rbxts/jest-globals";
import { QUAD_7 } from "./quad-7-volcanic";
import { tierTuning } from "./tuning";

describe("QUAD_7", () => {
	it("lists the volcanic giants bottom to top", () => {
		expect(QUAD_7.giants.map((giant) => giant.modelId)).toEqual(["FireTroll", "RedOrc", "MagmaBrute", "DoomBoss"]);
	});

	it("grows scale, strength and payout past the quad below", () => {
		let previous: { scale: number; recommendedStrength: number; winsPayout: number } = tierTuning(23);
		for (const giant of QUAD_7.giants) {
			expect(giant.scale).toBeGreaterThan(previous.scale);
			expect(giant.recommendedStrength).toBeGreaterThan(previous.recommendedStrength);
			expect(giant.winsPayout).toBeGreaterThan(previous.winsPayout);
			previous = giant;
		}
	});

	it("keeps every surge style within the allowed ranges", () => {
		for (const giant of QUAD_7.giants) {
			const surge = giant.surge;
			expect(surge).toBeDefined();
			if (!surge) continue;
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
