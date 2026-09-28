import { describe, expect, it } from "@rbxts/jest-globals";
import { splitBox } from "./box";

describe("splitBox", () => {
	it("returns a box within the limit unchanged", () => {
		const box = { center: new Vector3(1, 2, 3), size: new Vector3(10, 20, 30) };
		const pieces = splitBox(box, 100);
		expect(pieces.size()).toBe(1);
		expect(pieces[0].center === box.center).toBe(true);
		expect(pieces[0].size === box.size).toBe(true);
	});

	it("splits an oversized axis into equal pieces that tile the box", () => {
		const pieces = splitBox({ center: new Vector3(0, 0, 0), size: new Vector3(250, 10, 10) }, 100);
		expect(pieces.size()).toBe(3);
		const xs = pieces.map((p) => p.center.X).sort((a, b) => a < b);
		expect(xs[0]).toBeCloseTo(-250 / 3);
		expect(xs[1]).toBeCloseTo(0);
		expect(xs[2]).toBeCloseTo(250 / 3);
		for (const piece of pieces) expect(piece.size.X).toBeCloseTo(250 / 3);
	});

	it("splits every oversized axis", () => {
		const pieces = splitBox({ center: new Vector3(0, 0, 0), size: new Vector3(150, 150, 50) }, 100);
		expect(pieces.size()).toBe(4);
	});
});
