import { describe, expect, it } from "@rbxts/jest-globals";
import type { GiantDefinition } from "../../giants";
import { tierTuning } from "../../roster/tuning";
import { giantClearZone, laneClearZone } from "../../staircase";
import {
	Footprint,
	giantFootprint,
	layoutTerraces,
	planSlots,
	rampBetween,
	SPACER_FOOTPRINT,
	RampLayout,
	TerraceLayout,
} from "../../world-layout";
import type { ClearZone } from "../types";
import { Box, boxBetween, boxesOverlap, boxOf, planGap } from "./geometry";
import { keepOutBoxes, VolcanicSite } from "./keep-out";
import type { Piece } from "./pieces";
import {
	KEEP_OUT_GAP,
	LOW_PROP_HEIGHT,
	MAX_PROP_HEIGHT,
	planVolcanicZone,
	sideClearance,
	ZONE_PART_BUDGET,
} from "./plan";

const QUAD_INDEX = 6;
const GIANTS_BELOW = 24;
/** Quad 7's sizes, about tierTuning(24..27). */
const QUAD_7_SCALES = [8.4, 8.8, 9.3, 9.8];

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

/**
 * Quad 7's stretch as EncounterService builds it: the six full quads below
 * at their tuned sizes, with spacers, then `scales.size()` volcanic giants.
 */
function volcanicSite(scales: readonly number[]): VolcanicSite {
	const slots = planSlots([4, 4, 4, 4, 4, 4, scales.size()]);
	const scaleOf = (index: number) => (index < GIANTS_BELOW ? tierTuning(index).scale : scales[index - GIANTS_BELOW]);
	const layouts = layoutTerraces(
		slots.map((slot): Footprint =>
			slot.kind === "giant" ? giantFootprint(scaleOf(slot.giantIndex)) : SPACER_FOOTPRINT,
		),
	);
	const terraces: TerraceLayout[] = [];
	const ramps: RampLayout[] = [];
	const clearZones: ClearZone[] = [];
	slots.forEach((slot, index) => {
		if (slot.kind !== "giant" || slot.quadIndex !== QUAD_INDEX) return;
		const layout = layouts[index];
		terraces.push(layout);
		if (index > 0) ramps.push(rampBetween(layouts[index - 1], layout));
		clearZones.push(giantClearZone(giant(scaleOf(slot.giantIndex)), layout), laneClearZone(layout));
	});
	return { terraces, ramps, clearZones };
}

/** The gate wall and ramp exactly as staircase.ts builds them. */
function builtObstacles(site: VolcanicSite): Box[] {
	const boxes: Box[] = [];
	for (const terrace of site.terraces) {
		const half = terrace.width / 2;
		boxes.push(
			boxBetween(
				new Vector3(-half, terrace.floorY, terrace.frontZ - 1),
				new Vector3(half, terrace.floorY + 14, terrace.frontZ),
			),
		);
	}
	for (const ramp of site.ramps) {
		boxes.push(boxBetween(new Vector3(-8, ramp.from.Y - 2, ramp.from.Z), new Vector3(8, ramp.to.Y + 6, ramp.to.Z)));
	}
	return boxes;
}

function terraceOf(site: VolcanicSite, piece: Piece): TerraceLayout {
	const z = piece.cframe.Position.Z;
	const terrace = site.terraces.find((layout) => z <= layout.frontZ && z >= layout.backZ);
	if (terrace === undefined) error(`piece ${piece.name} at z ${z} is on no terrace`);
	return terrace;
}

const SITES: [string, VolcanicSite][] = [
	["one giant", volcanicSite([8.4])],
	["two giants", volcanicSite([8.4, 8.8])],
	["three giants", volcanicSite([8.4, 8.8, 9.3])],
	["a full quad", volcanicSite(QUAD_7_SCALES)],
	["a full quad of the smallest", volcanicSite([8.4, 8.4, 8.4, 8.4])],
	["a full quad of the biggest", volcanicSite([9.8, 9.8, 9.8, 9.8])],
];

describe("planVolcanicZone", () => {
	it("builds nothing for a quad with no giants yet", () => {
		const site = volcanicSite([]);
		expect(site.terraces.size()).toBe(0);
		expect(planVolcanicZone(site).size()).toBe(0);
	});

	for (const [name, site] of SITES) {
		describe(`for ${name}`, () => {
			const pieces = planVolcanicZone(site);
			const keepOut = keepOutBoxes(site);
			const solid = pieces.filter((piece) => piece.collide);

			it("stays within the part budget", () => {
				expect(pieces.size()).toBeLessThanOrEqual(ZONE_PART_BUDGET);
			});

			it("dresses every terrace with lava and solid props", () => {
				for (const terrace of site.terraces) {
					const on = pieces.filter((piece) => terraceOf(site, piece) === terrace);
					expect(on.filter((piece) => piece.name === "LavaPool").size()).toBe(2);
					expect(on.filter((piece) => piece.collide).size()).toBeGreaterThan(20);
				}
			});

			it("puts no solid prop inside a keep-out box", () => {
				for (const piece of solid) {
					const box = boxOf(piece.cframe, piece.size);
					for (const zone of keepOut) expect(boxesOverlap(box, zone)).toBe(false);
				}
			});

			it("keeps every solid prop a clear gap from the keep-out boxes, the gates and the ramps, seen from above", () => {
				const obstacles = [...keepOut, ...builtObstacles(site)];
				for (const piece of solid) {
					const box = boxOf(piece.cframe, piece.size);
					for (const obstacle of obstacles) {
						expect(planGap(box, obstacle)).toBeGreaterThanOrEqual(KEEP_OUT_GAP - 1e-6);
					}
				}
			});

			it("keeps solid props on their own terrace", () => {
				for (const piece of solid) {
					const terrace = terraceOf(site, piece);
					const box = boxOf(piece.cframe, piece.size);
					expect(math.abs(box.min.X)).toBeLessThanOrEqual(terrace.width / 2);
					expect(math.abs(box.max.X)).toBeLessThanOrEqual(terrace.width / 2);
					expect(box.max.Z).toBeLessThanOrEqual(terrace.frontZ);
					expect(box.min.Z).toBeGreaterThanOrEqual(terrace.backZ);
				}
			});

			it("keeps the lava out of the walking lane and off the pedestals", () => {
				const clear = site.clearZones.map((zone) => boxOf(zone.cframe, zone.size));
				for (const piece of pieces) {
					if (piece.material !== Enum.Material.Neon && piece.material !== Enum.Material.CrackedLava) continue;
					if (piece.collide) continue;
					const box = boxOf(piece.cframe, piece.size);
					for (const zone of clear) expect(planGap(box, zone)).toBeGreaterThan(0);
				}
			});

			it("hides no giant: tall props stand beside the pedestal, and none too tall", () => {
				for (const piece of pieces) {
					const terrace = terraceOf(site, piece);
					const box = boxOf(piece.cframe, piece.size);
					expect(box.max.Y).toBeLessThanOrEqual(terrace.floorY + MAX_PROP_HEIGHT + 1e-6);
					if (box.max.Y <= terrace.floorY + LOW_PROP_HEIGHT) continue;
					const nearest = math.min(math.abs(box.min.X), math.abs(box.max.X));
					const straddles = box.min.X < 0 && box.max.X > 0;
					expect(!straddles && nearest >= sideClearance(site, terrace)).toBe(true);
				}
			});

			it("lays out the same way every time", () => {
				const again = planVolcanicZone(site);
				expect(again.size()).toBe(pieces.size());
				for (let i = 0; i < pieces.size(); i++) {
					expect(again[i].cframe.Position.sub(pieces[i].cframe.Position).Magnitude).toBe(0);
					expect(again[i].size.sub(pieces[i].size).Magnitude).toBe(0);
				}
			});
		});
	}
});
