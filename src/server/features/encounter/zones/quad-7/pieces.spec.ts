import { describe, expect, it } from "@rbxts/jest-globals";
import { boxOf } from "./geometry";
import {
	charredTree,
	lavaPool,
	lavaRun,
	Piece,
	rockCluster,
	rockHeight,
	smokingVent,
	VENT_HEIGHT,
	volcanicCone,
} from "./pieces";

const EPSILON = 1e-4;
const FLOOR = new Vector3(30, 200, -500);
const SEEDS = 60;

/** Whether every piece's bounds stay inside the upright cylinder's square footprint, from below `height` down. */
function staysInside(pieces: readonly Piece[], radius: number, height: number): boolean {
	return pieces.every((piece) => {
		const box = boxOf(piece.cframe, piece.size);
		return (
			box.min.X >= FLOOR.X - radius - EPSILON &&
			box.max.X <= FLOOR.X + radius + EPSILON &&
			box.min.Z >= FLOOR.Z - radius - EPSILON &&
			box.max.Z <= FLOOR.Z + radius + EPSILON &&
			box.max.Y <= FLOOR.Y + height + EPSILON
		);
	});
}

describe("prop generators", () => {
	it("keep a volcanic cone inside its footprint and height", () => {
		for (let seed = 1; seed <= SEEDS; seed++) {
			const rng = new Random(seed);
			const radius = rng.NextNumber(3, 7);
			const height = rng.NextNumber(10, 24);
			expect(staysInside(volcanicCone(FLOOR, radius, height, rng), radius, height)).toBe(true);
		}
	});

	it("keep a charred tree's branches inside its footprint and height", () => {
		for (let seed = 1; seed <= SEEDS; seed++) {
			const rng = new Random(seed);
			const radius = rng.NextNumber(2.5, 6);
			const height = rng.NextNumber(10, 24);
			expect(staysInside(charredTree(FLOOR, radius, height, rng), radius, height)).toBe(true);
		}
	});

	it("keep a vent low and inside its footprint", () => {
		for (let seed = 1; seed <= SEEDS; seed++) {
			const rng = new Random(seed);
			const radius = rng.NextNumber(1.5, 4);
			expect(staysInside(smokingVent(FLOOR, radius, rng), radius, VENT_HEIGHT)).toBe(true);
		}
	});

	it("keep a rock cluster inside its footprint however its rocks turn", () => {
		for (let seed = 1; seed <= SEEDS; seed++) {
			const rng = new Random(seed);
			const radius = rng.NextNumber(1, 6);
			expect(staysInside(rockCluster(FLOOR, radius, 3, rng), radius, rockHeight(radius))).toBe(true);
		}
	});

	it("make solid rock and wood, and glowing parts walk-through", () => {
		const rng = new Random(1);
		const pieces = [
			...volcanicCone(FLOOR, 5, 16, rng),
			...charredTree(FLOOR, 4, 16, rng),
			...smokingVent(FLOOR, 2.5, rng),
			...rockCluster(FLOOR, 4, 3, rng),
		];
		for (const piece of pieces) expect(piece.collide).toBe(piece.material !== Enum.Material.Neon);
	});
});

describe("lava", () => {
	it("never collides", () => {
		const pieces = [lavaRun("LavaRiver", FLOOR, FLOOR.add(new Vector3(3, 0, -20)), 4), ...lavaPool(FLOOR, 7, 9.5)];
		for (const piece of pieces) expect(piece.collide).toBe(false);
	});

	it("lies flat on the floor, just proud of it", () => {
		const river = lavaRun("LavaRiver", FLOOR, FLOOR.add(new Vector3(0, 0, -20)), 4);
		const run = boxOf(river.cframe, river.size);
		expect(run.max.Y).toBeGreaterThan(FLOOR.Y);
		expect(run.max.Y).toBeLessThan(FLOOR.Y + 0.5);
		for (const piece of lavaPool(FLOOR, 7, 9.5)) {
			const box = boxOf(piece.cframe, piece.size);
			expect(box.max.Y).toBeGreaterThan(FLOOR.Y);
			expect(box.max.Y).toBeLessThan(FLOOR.Y + 0.5);
		}
	});
});
