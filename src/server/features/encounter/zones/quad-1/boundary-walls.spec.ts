import { describe, expect, it } from "@rbxts/jest-globals";
import { tierTuning } from "../../roster/tuning";
import { giantFootprint, layoutTerraces } from "../../world-layout";
import { planBoundaryWalls, WALL_HEIGHT } from "./boundary-walls";
import { BASEPLATE_HALF, meadowHalfWidth } from "./plan";

/** The first quad as the game builds it: four giants climbing past the baseplate's far edge. */
const terraces = layoutTerraces([0, 1, 2, 3].map((i) => giantFootprint(tierTuning(i).scale)));
const walls = planBoundaryWalls(terraces);

function bounds(size: Vector3, center: Vector3) {
	return { min: center.sub(size.div(2)), max: center.add(size.div(2)) };
}

describe("planBoundaryWalls", () => {
	it("builds nothing without terraces", () => {
		expect(planBoundaryWalls([]).size()).toBe(0);
	});

	it("is solid cobblestone, tall enough to read as a mega wall", () => {
		for (const part of walls) {
			expect(part.collide).toBe(true);
			expect(part.material).toBe(Enum.Material.Cobblestone);
		}
		expect(walls.some((part) => part.name === "Wall" && part.size.Y >= WALL_HEIGHT)).toBe(true);
	});

	it("stands just outside the baseplate, never more than a pillar's overhang inside it", () => {
		for (const part of walls) {
			const box = bounds(part.size, part.cframe.Position);
			const inside =
				box.max.X > -BASEPLATE_HALF + 3 &&
				box.min.X < BASEPLATE_HALF - 3 &&
				box.max.Z > -BASEPLATE_HALF + 3 &&
				box.min.Z < BASEPLATE_HALF - 3;
			expect(inside).toBe(false);
		}
	});

	it("closes behind the spawn and both sides", () => {
		const covers = (test: (box: ReturnType<typeof bounds>) => boolean) =>
			walls.some((part) => part.name === "Wall" && test(bounds(part.size, part.cframe.Position)));
		expect(covers((box) => box.min.Z >= BASEPLATE_HALF && box.max.X - box.min.X >= 2 * BASEPLATE_HALF)).toBe(true);
		expect(covers((box) => box.max.X <= -BASEPLATE_HALF && box.max.Z - box.min.Z >= 2 * BASEPLATE_HALF)).toBe(true);
		expect(covers((box) => box.min.X >= BASEPLATE_HALF && box.max.Z - box.min.Z >= 2 * BASEPLATE_HALF)).toBe(true);
	});

	it("leaves the climb's ground open at the far edge", () => {
		const opening = meadowHalfWidth(terraces);
		for (const part of walls) {
			const box = bounds(part.size, part.cframe.Position);
			if (box.max.Z > -BASEPLATE_HALF) continue;
			expect(box.min.X >= opening - 7 || box.max.X <= -opening + 7).toBe(true);
		}
	});
});
