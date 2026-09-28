import { describe, expect, it } from "@rbxts/jest-globals";
import { hasFallen } from "./fall-policy";

// A body's root sits about 0.6 body heights above its feet.
const standing = (surfaceY: number, bodyHeight: number) => surfaceY + 0.6 * bodyHeight;

describe("hasFallen", () => {
	it("leaves a 1× body standing on a terrace alone", () => {
		expect(hasFallen(standing(70, 5), 70, 0, 5)).toBe(false);
	});

	it("catches a 1× body three heights below the surface", () => {
		expect(hasFallen(70 - 14, 70, 0, 5)).toBe(false);
		expect(hasFallen(70 - 16, 70, 0, 5)).toBe(true);
	});

	it("catches a large body standing on the valley floor before it falls three heights", () => {
		// A 10× body off terrace 1 (top 70) lands on the floor at 0, only 70 studs down.
		expect(hasFallen(standing(0, 50), 70, 0, 50)).toBe(true);
	});

	it("leaves a 25× body standing on the base (top 60) alone", () => {
		expect(hasFallen(standing(60, 125), 60, 0, 125)).toBe(false);
	});

	it("leaves a large body walking down onto a lower terrace alone", () => {
		expect(hasFallen(standing(80, 50), 91, 0, 50)).toBe(false);
	});
});
