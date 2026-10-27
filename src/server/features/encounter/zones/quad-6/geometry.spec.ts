import { describe, expect, it } from "@rbxts/jest-globals";
import { gateKeepOut, overlaps, rampKeepOut, separation, withinTerrace } from "./geometry";

const zone = { cframe: new CFrame(0, 5, 0), size: new Vector3(10, 10, 10) };
const unit = new Vector3(2, 2, 2);

describe("separation", () => {
	it("measures the gap along the widest separating axis", () => {
		expect(separation(zone, new CFrame(10, 5, 0), unit, false)).toBeCloseTo(4);
		expect(separation(zone, new CFrame(0, 5, -9), unit, true)).toBeCloseTo(3);
	});

	it("is zero or less for overlapping boxes", () => {
		expect(separation(zone, new CFrame(5, 5, 0), unit, false)).toBeLessThanOrEqual(0);
		expect(overlaps(zone, new CFrame(5, 5, 0), unit)).toBe(true);
	});

	it("ignores height in plan view", () => {
		const above = new CFrame(0, 30, 0);
		expect(overlaps(zone, above, unit)).toBe(false);
		expect(separation(zone, above, unit, true)).toBeLessThanOrEqual(0);
	});

	it("counts a rotated box by its corners", () => {
		const turned = new CFrame(6.2, 5, 0).mul(CFrame.Angles(0, math.pi / 4, 0));
		expect(overlaps(zone, turned, unit)).toBe(true);
	});
});

describe("keep-outs", () => {
	const layout = {
		floorY: 20,
		frontZ: -100,
		backZ: -200,
		width: 120,
		giantPosition: new Vector3(0, 20, -155),
	};

	it("covers the gate wall on the front edge", () => {
		expect(overlaps(gateKeepOut(layout), new CFrame(50, 27, -100.5), new Vector3(1, 14, 1))).toBe(true);
		expect(overlaps(gateKeepOut(layout), new CFrame(50, 21, -103), unit)).toBe(false);
	});

	it("covers a ramp's whole width and run", () => {
		const corridor = rampKeepOut({ from: new Vector3(0, 0, -60), to: new Vector3(0, 20, -100) });
		expect(overlaps(corridor, new CFrame(7, 10, -80), unit)).toBe(true);
		expect(overlaps(corridor, new CFrame(10, 10, -80), unit)).toBe(false);
	});

	it("keeps a box on the terrace top", () => {
		expect(withinTerrace(layout, new CFrame(0, 20, -150), unit, 1)).toBe(true);
		expect(withinTerrace(layout, new CFrame(59.5, 20, -150), unit, 1)).toBe(false);
		expect(withinTerrace(layout, new CFrame(0, 20, -100.5), unit, 1)).toBe(false);
	});
});
