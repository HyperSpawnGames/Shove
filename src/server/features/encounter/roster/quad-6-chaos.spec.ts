import { describe, expect, it } from "@rbxts/jest-globals";
import { QUAD_6 } from "./quad-6-chaos";
import { tierTuning } from "./tuning";

describe("QUAD_6", () => {
	it("lists the Chaos giants in climbing order", () => {
		expect(QUAD_6.giants.map((giant) => giant.modelId)).toEqual([
			"DemonNinja",
			"ChaosMage",
			"ChaosSummoner",
			"VoidTyrant",
		]);
	});

	it("grows scale, strength and payout strictly from the previous quad's top", () => {
		let previous = tierTuning(19);
		for (const giant of QUAD_6.giants) {
			expect(giant.scale).toBeGreaterThan(previous.scale);
			expect(giant.recommendedStrength).toBeGreaterThan(previous.recommendedStrength);
			expect(giant.winsPayout).toBeGreaterThan(previous.winsPayout);
			previous = giant;
		}
	});

	it("keeps every surge style within the allowed ranges", () => {
		for (const giant of QUAD_6.giants) {
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
