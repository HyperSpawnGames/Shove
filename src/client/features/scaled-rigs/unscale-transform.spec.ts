import { describe, expect, it } from "@rbxts/jest-globals";
import { unscaleTransform } from "./unscale-transform";

describe("unscaleTransform", () => {
	it("divides the translation by the scale", () => {
		const result = unscaleTransform(new CFrame(4, 8, -12), 4);
		expect(result.Position.FuzzyEq(new Vector3(1, 2, -3))).toBe(true);
	});

	it("keeps the rotation", () => {
		const transform = CFrame.Angles(0.3, -0.2, 0.9).add(new Vector3(2, 0, 0));
		const result = unscaleTransform(transform, 2);
		expect(result.Rotation.LookVector.FuzzyEq(transform.Rotation.LookVector)).toBe(true);
		expect(result.Rotation.UpVector.FuzzyEq(transform.Rotation.UpVector)).toBe(true);
	});

	it("is the identity at 1×", () => {
		const transform = CFrame.Angles(0.1, 0.2, 0.3).add(new Vector3(1, 2, 3));
		expect(unscaleTransform(transform, 1).Position.FuzzyEq(transform.Position)).toBe(true);
	});
});
