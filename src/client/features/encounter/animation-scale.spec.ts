import { describe, expect, it } from "@rbxts/jest-globals";
import { correctedTransform, probeVerdict, shouldApplyFixup, translationRatio } from "./animation-scale";

describe("correctedTransform", () => {
	it("divides the translation by the scale", () => {
		const corrected = correctedTransform(new CFrame(8, -4, 2), 4);
		expect(corrected.Position.FuzzyEq(new Vector3(2, -1, 0.5), 1e-6)).toBe(true);
	});

	it("leaves the rotation alone", () => {
		const rotation = CFrame.Angles(0.3, -1.1, 0.7);
		const corrected = correctedTransform(new CFrame(6, 0, 0).mul(rotation), 3);
		expect(corrected.Rotation.FuzzyEq(rotation, 1e-6)).toBe(true);
	});
});

describe("translationRatio", () => {
	it("compares total translation across the joints both rigs share", () => {
		const reference = new Map([
			["Neck", 0.1],
			["Waist", 0.3],
		]);
		const scaled = new Map([
			["Neck", 1.6],
			["Waist", 4.8],
			["Root", 50],
		]);
		expect(translationRatio(reference, scaled)).toBeCloseTo(16);
	});

	it("ignores joints that barely move at 1x", () => {
		const reference = new Map([
			["Neck", 0.2],
			["LeftWrist", 1e-5],
		]);
		const scaled = new Map([
			["Neck", 0.8],
			["LeftWrist", 3],
		]);
		expect(translationRatio(reference, scaled)).toBeCloseTo(4);
	});

	it("has no answer when nothing moves", () => {
		expect(translationRatio(new Map([["Neck", 0]]), new Map([["Neck", 0]]))).toBeUndefined();
		expect(translationRatio(new Map(), new Map())).toBeUndefined();
	});
});

describe("probeVerdict", () => {
	it("calls a ratio near the scale squared doubled", () => {
		expect(probeVerdict(16, 4)).toBe("doubled");
		expect(probeVerdict(15.71, 4)).toBe("doubled");
		expect(probeVerdict(36.5, 6)).toBe("doubled");
	});

	it("calls a ratio near the scale correct", () => {
		expect(probeVerdict(4, 4)).toBe("correct");
		expect(probeVerdict(4.3, 4)).toBe("correct");
		expect(probeVerdict(6, 6)).toBe("correct");
	});

	it("calls anything else inconclusive", () => {
		expect(probeVerdict(8, 4)).toBe("inconclusive");
		expect(probeVerdict(1, 4)).toBe("inconclusive");
		expect(probeVerdict(64, 4)).toBe("inconclusive");
		expect(probeVerdict(undefined, 4)).toBe("inconclusive");
		expect(probeVerdict(0, 4)).toBe("inconclusive");
		expect(probeVerdict(0 / 0, 4)).toBe("inconclusive");
	});

	it("cannot tell the cases apart at scale 1", () => {
		expect(probeVerdict(1, 1)).toBe("inconclusive");
	});
});

describe("shouldApplyFixup", () => {
	it("stays off only when the engine was seen to animate correctly", () => {
		expect(shouldApplyFixup("correct")).toBe(false);
		expect(shouldApplyFixup("doubled")).toBe(true);
		expect(shouldApplyFixup("inconclusive")).toBe(true);
	});
});
