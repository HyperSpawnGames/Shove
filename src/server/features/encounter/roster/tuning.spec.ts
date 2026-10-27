import { describe, expect, it } from "@rbxts/jest-globals";
import { tierTuning } from "./tuning";

describe("tierTuning", () => {
	it("keeps the hand-tuned first quad", () => {
		expect(tierTuning(0).scale).toBe(1.6);
		expect(tierTuning(0).recommendedStrength).toBe(20);
		expect(tierTuning(3).scale).toBe(3);
	});

	it("grows every value with each giant", () => {
		for (let i = 1; i < 32; i++) {
			const previous = tierTuning(i - 1);
			const current = tierTuning(i);
			expect(current.scale).toBeGreaterThan(previous.scale);
			expect(current.recommendedStrength).toBeGreaterThan(previous.recommendedStrength);
			expect(current.winsPayout).toBeGreaterThan(previous.winsPayout);
		}
	});

	it("rounds to two significant figures", () => {
		const strength = tierTuning(10).recommendedStrength;
		const magnitude = 10 ** (math.floor(math.log10(strength)) - 1);
		expect(strength % magnitude).toBe(0);
	});

	it("keeps the last giant within a camera-friendly size", () => {
		expect(tierTuning(31).scale).toBeLessThan(13);
	});
});
