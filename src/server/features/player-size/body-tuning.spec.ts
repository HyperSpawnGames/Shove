import { describe, expect, it } from "@rbxts/jest-globals";
import { bodyTuning, FRAMING_DISTANCE, isValidScale, MAX_SCALE, MIN_SCALE } from "./body-tuning";

describe("isValidScale", () => {
	it("accepts the bounds and anything between", () => {
		expect(isValidScale(MIN_SCALE)).toBe(true);
		expect(isValidScale(1)).toBe(true);
		expect(isValidScale(MAX_SCALE)).toBe(true);
	});

	it("rejects sizes outside the bounds, NaN and infinity", () => {
		expect(isValidScale(MIN_SCALE - 0.01)).toBe(false);
		expect(isValidScale(MAX_SCALE + 0.01)).toBe(false);
		expect(isValidScale(0 / 0)).toBe(false);
		expect(isValidScale(math.huge)).toBe(false);
	});
});

const defaults = { walkSpeed: 16, jumpHeight: 7.2, cameraMaxZoom: 400 };

describe("bodyTuning", () => {
	it("returns the defaults at 1×, with the camera held at the default framing", () => {
		const tuning = bodyTuning(1, defaults);
		expect(tuning.walkSpeed).toBe(16);
		expect(tuning.jumpHeight).toBe(7.2);
		expect(tuning.cameraMinZoom).toBe(FRAMING_DISTANCE);
		expect(tuning.cameraMaxZoom).toBe(400);
	});

	it("scales speed, jump and zoom with the body", () => {
		const tuning = bodyTuning(10, defaults);
		expect(tuning.walkSpeed).toBe(160);
		expect(tuning.jumpHeight).toBeCloseTo(72);
		expect(tuning.cameraMinZoom).toBe(125);
		expect(tuning.cameraMaxZoom).toBe(4000);
	});

	it("never lets the maximum zoom fall below the minimum", () => {
		const tuning = bodyTuning(2, { ...defaults, cameraMaxZoom: 5 });
		expect(tuning.cameraMaxZoom >= tuning.cameraMinZoom).toBe(true);
	});
});
