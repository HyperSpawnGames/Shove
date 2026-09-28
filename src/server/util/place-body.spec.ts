import { describe, expect, it } from "@rbxts/jest-globals";
import { rootCFrameForFeet } from "./place-body";

describe("rootCFrameForFeet", () => {
	it("raises the root by HipHeight plus half its height", () => {
		const root = rootCFrameForFeet(new CFrame(10, 70, -5), 2, 2);
		expect(root.Position.X).toBe(10);
		expect(root.Position.Y).toBe(73);
		expect(root.Position.Z).toBe(-5);
	});

	it("keeps the orientation of the feet", () => {
		const feet = CFrame.lookAt(new Vector3(0, 0, 0), new Vector3(0, 0, 1));
		const root = rootCFrameForFeet(feet, 20, 20);
		expect(root.LookVector.FuzzyEq(feet.LookVector)).toBe(true);
		expect(root.Position.Y).toBe(30);
	});
});
