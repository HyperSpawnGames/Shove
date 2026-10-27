import { describe, expect, it } from "@rbxts/jest-globals";
import { tierTuning } from "../../roster/tuning";
import type { GiantDefinition } from "../../roster/types";
import { giantClearZone, laneClearZone } from "../../staircase";
import {
	Footprint,
	giantFootprint,
	layoutTerraces,
	planSlots,
	SPACER_FOOTPRINT,
	TerraceLayout,
} from "../../world-layout";
import type { ClearZone } from "../types";
import { boundsOf, boxesOverlap, Piece, planGap, seededRandom } from "./castle-geometry";
import { keepsClear, onTerrace, PLAN_MARGIN, planCastleTerrace, TERRACE_PART_BUDGET } from "./castle-plan";

const CASTLE = 3;

function giant(scale: number): GiantDefinition {
	return {
		modelId: "Test",
		displayName: "Test",
		scale,
		recommendedStrength: 1,
		resistancePerSecond: 0.04,
		winsPayout: 1,
	};
}

interface Staircase {
	/** The castle quad's terraces, bottom first. */
	terraces: TerraceLayout[];
	/** Every keep-clear box on the staircase, as the service gathers them per zone. */
	clearZones: ClearZone[];
	/** Each castle terrace's lane box. */
	lanes: ClearZone[];
}

/** Three full quads below, `castleGiants` castle giants, and optionally a quad above, sized from tierTuning. */
function staircase(castleGiants: number, scales?: number[]): Staircase {
	const sizes = [4, 4, 4, castleGiants];
	const slots = planSlots(sizes);
	const scaleOf = (index: number) =>
		scales !== undefined && index >= 12 ? scales[(index - 12) % scales.size()] : tierTuning(index).scale;
	const footprints = slots.map((slot): Footprint =>
		slot.kind === "giant" ? giantFootprint(scaleOf(slot.giantIndex)) : SPACER_FOOTPRINT,
	);
	const layouts = layoutTerraces(footprints);
	const result: Staircase = { terraces: [], clearZones: [], lanes: [] };
	slots.forEach((slot, index) => {
		if (slot.kind !== "giant" || slot.quadIndex !== CASTLE) return;
		const layout = layouts[index];
		const lane = laneClearZone(layout);
		result.terraces.push(layout);
		result.lanes.push(lane);
		result.clearZones.push(giantClearZone(giant(scaleOf(slot.giantIndex)), layout), lane);
	});
	return result;
}

function plan(stairs: Staircase): Piece[][] {
	return stairs.terraces.map((layout, index) => planCastleTerrace(layout, stairs.clearZones, CASTLE * 1000 + index));
}

const CASES: [string, Staircase][] = [
	["four tuned giants", staircase(4)],
	["two tuned giants", staircase(2)],
	["one giant", staircase(1)],
	["the smallest castle giants", staircase(4, [4.6])],
	["the largest castle giants", staircase(4, [5.4])],
	["much smaller giants", staircase(3, [2, 3, 2.5])],
];

describe("planCastleTerrace", () => {
	it("dresses nothing when the quad has no giants yet", () => {
		expect(staircase(0).terraces.size()).toBe(0);
	});

	for (const [name, stairs] of CASES) {
		describe(name, () => {
			const terraces = plan(stairs);

			it("stays within the part budget", () => {
				let total = 0;
				for (const pieces of terraces) {
					expect(pieces.size() <= TERRACE_PART_BUDGET).toBe(true);
					total += pieces.size();
				}
				expect(total <= 600).toBe(true);
			});

			it("keeps every collidable piece out of every keep-clear box", () => {
				for (const pieces of terraces) {
					for (const piece of pieces) {
						if (!piece.collidable) continue;
						const box = boundsOf(piece.cframe, piece.size);
						for (const zone of stairs.clearZones) {
							expect(boxesOverlap(box, boundsOf(zone.cframe, zone.size))).toBe(false);
						}
					}
				}
			});

			it("leaves a margin, seen from above, between collidable pieces and any box at their height", () => {
				for (const pieces of terraces) {
					for (const piece of pieces) {
						if (!piece.collidable) continue;
						const box = boundsOf(piece.cframe, piece.size);
						for (const zone of stairs.clearZones) {
							const clear = boundsOf(zone.cframe, zone.size);
							const atItsHeight = box.min.Y < clear.max.Y && box.max.Y > clear.min.Y;
							if (atItsHeight) expect(planGap(box, clear) >= PLAN_MARGIN).toBe(true);
						}
					}
				}
			});

			it("hangs nothing but the flush flagstones in the lane or around a giant", () => {
				for (const pieces of terraces) {
					for (const piece of pieces) {
						if (piece.name === "Flagstones") continue;
						const box = boundsOf(piece.cframe, piece.size);
						for (const zone of stairs.clearZones) {
							expect(boxesOverlap(box, boundsOf(zone.cframe, zone.size))).toBe(false);
						}
					}
				}
			});

			it("keeps every piece on its own terrace", () => {
				terraces.forEach((pieces, index) => {
					for (const piece of pieces) {
						expect(onTerrace(boundsOf(piece.cframe, piece.size), stairs.terraces[index])).toBe(true);
					}
				});
			});

			it("keeps the flagstones flush with the floor", () => {
				terraces.forEach((pieces, index) => {
					const path = pieces.find((piece) => piece.name === "Flagstones");
					expect(path?.collidable).toBe(false);
					const top = path!.cframe.Position.Y + path!.size.Y / 2;
					expect(math.abs(top - stairs.terraces[index].floorY) < 0.1).toBe(true);
				});
			});

			it("builds the keep on every terrace: towers, walls, a gateway, banners and lit braziers", () => {
				for (const pieces of terraces) {
					const count = (name: string) => pieces.filter((piece) => piece.name === name).size();
					expect(count("TowerBody")).toBe(4);
					expect(count("Wall") >= 4).toBe(true);
					expect(count("GateLintel")).toBe(1);
					expect(count("Banner") >= 2).toBe(true);
					expect(pieces.filter((piece) => piece.fire === true).size() >= 2).toBe(true);
				}
			});
		});
	}

	it("lifts the gateway's lintel clear above the lane", () => {
		const stairs = staircase(4);
		plan(stairs).forEach((pieces, index) => {
			const lane = boundsOf(stairs.lanes[index].cframe, stairs.lanes[index].size);
			const lintel = pieces.find((piece) => piece.name === "GateLintel")!;
			expect(boundsOf(lintel.cframe, lintel.size).min.Y > lane.max.Y).toBe(true);
		});
	});

	it("places the same props for the same seed", () => {
		const stairs = staircase(4);
		const a = plan(stairs);
		const b = plan(stairs);
		a.forEach((pieces, index) => {
			expect(pieces.size()).toBe(b[index].size());
			pieces.forEach((piece, i) => {
				expect(piece.name).toBe(b[index][i].name);
				expect(piece.cframe.Position.sub(b[index][i].cframe.Position).Magnitude < 1e-6).toBe(true);
			});
		});
	});
});

describe("keepsClear", () => {
	const zone = { min: new Vector3(-10, 0, -10), max: new Vector3(10, 12, 10) };

	it("rejects a box at the zone's height closer than the margin", () => {
		expect(keepsClear({ min: new Vector3(10.5, 0, 0), max: new Vector3(12, 4, 2) }, zone)).toBe(false);
		expect(keepsClear({ min: new Vector3(11, 0, 0), max: new Vector3(12, 4, 2) }, zone)).toBe(true);
	});

	it("allows a box above the zone, like a lintel over the lane", () => {
		expect(keepsClear({ min: new Vector3(-12, 14, -1), max: new Vector3(12, 18, 1) }, zone)).toBe(true);
	});
});

describe("castle geometry", () => {
	it("bounds a turned part by its corners", () => {
		const box = boundsOf(new CFrame(0, 5, 0).mul(CFrame.Angles(0, 0, math.pi / 4)), new Vector3(2, 2, 2));
		expect(math.abs(box.max.X - math.sqrt(2)) < 1e-6).toBe(true);
		expect(math.abs(box.min.Y - (5 - math.sqrt(2))) < 1e-6).toBe(true);
	});

	it("does not count touching boxes as overlapping", () => {
		const a = { min: new Vector3(0, 0, 0), max: new Vector3(1, 1, 1) };
		const b = { min: new Vector3(1, 0, 0), max: new Vector3(2, 1, 1) };
		expect(boxesOverlap(a, b)).toBe(false);
		expect(planGap(a, b)).toBe(0);
	});

	it("measures the plan-view gap diagonally", () => {
		const a = { min: new Vector3(0, 0, 0), max: new Vector3(1, 1, 1) };
		const b = { min: new Vector3(4, 50, 5), max: new Vector3(5, 51, 6) };
		expect(planGap(a, b)).toBe(5);
	});

	it("draws the same numbers in [0, 1) from the same seed", () => {
		const a = seededRandom(3001);
		const b = seededRandom(3001);
		for (let i = 0; i < 100; i++) {
			const value = a();
			expect(value).toBe(b());
			expect(value >= 0 && value < 1).toBe(true);
		}
	});
});
