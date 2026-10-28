import { describe, expect, it } from "@rbxts/jest-globals";
import {
	checkpointSpawn,
	gateOpensAt,
	giantFootprint,
	layoutTerraces,
	planSlots,
	RAMP_RUN,
	rampBetween,
	SPACER_FOOTPRINT,
	standingOn,
} from "./world-layout";

describe("planSlots", () => {
	it("puts a spacer between quads, not after the last", () => {
		const kinds = planSlots([4, 4]).map((slot) => slot.kind);
		expect(kinds.join(",")).toBe("giant,giant,giant,giant,spacer,giant,giant,giant,giant");
	});

	it("numbers giants across quads", () => {
		const slots = planSlots([2, 3]);
		const last = slots[slots.size() - 1];
		expect(last.kind === "giant" && last.giantIndex).toBe(4);
		expect(last.kind === "giant" && last.quadIndex).toBe(1);
	});

	it("skips quads with no giants yet", () => {
		expect(planSlots([4, 0, 0]).size()).toBe(4);
		expect(planSlots([0, 4]).size()).toBe(4);
	});
});

describe("layoutTerraces", () => {
	const footprints = [giantFootprint(1.6), giantFootprint(2), SPACER_FOOTPRINT, giantFootprint(3)];
	const layouts = layoutTerraces(footprints);

	it("puts the first terrace on the ground", () => {
		expect(layouts[0].floorY).toBe(0);
	});

	it("climbs with every slot", () => {
		for (let i = 1; i < layouts.size(); i++) expect(layouts[i].floorY).toBeGreaterThan(layouts[i - 1].floorY);
	});

	it("leaves exactly one ramp run between consecutive terraces", () => {
		for (let i = 1; i < layouts.size(); i++) expect(layouts[i - 1].backZ - layouts[i].frontZ).toBe(RAMP_RUN);
	});

	it("stands each giant on its own terrace", () => {
		for (const layout of layouts) {
			expect(layout.giantPosition.Z < layout.frontZ && layout.giantPosition.Z > layout.backZ).toBe(true);
		}
	});

	it("gives a bigger giant more floor", () => {
		expect(giantFootprint(6).depth).toBeGreaterThan(giantFootprint(2).depth);
		expect(giantFootprint(6).width).toBeGreaterThan(giantFootprint(2).width);
	});

	it("keeps every ramp walkable: under 35 degrees", () => {
		for (let i = 1; i < layouts.size(); i++) {
			const ramp = rampBetween(layouts[i - 1], layouts[i]);
			const slope = math.deg(math.atan2(ramp.to.Y - ramp.from.Y, ramp.from.Z - ramp.to.Z));
			expect(slope).toBeLessThan(35);
		}
	});
});

describe("gateOpensAt", () => {
	const slots = planSlots([4, 4]);

	it("needs no gate onto the ground", () => {
		expect(gateOpensAt(slots, 0)).toBe(undefined);
	});

	it("opens each giant's ramp with the giant below it", () => {
		expect(gateOpensAt(slots, 1)).toBe(1);
		expect(gateOpensAt(slots, 3)).toBe(3);
	});

	it("opens the spacer with the quad's last giant", () => {
		expect(gateOpensAt(slots, 4)).toBe(4);
	});

	it("leaves the ramp out of a spacer open", () => {
		expect(gateOpensAt(slots, 5)).toBe(undefined);
	});

	it("opens the next quad's second giant with its first", () => {
		expect(gateOpensAt(slots, 6)).toBe(5);
	});
});

describe("standingOn", () => {
	const [, terrace] = layoutTerraces([SPACER_FOOTPRINT, SPACER_FOOTPRINT]);
	const middle = new Vector3(0, terrace.floorY + 3, (terrace.frontZ + terrace.backZ) / 2);

	it("counts a body standing in the middle", () => {
		expect(standingOn(middle, terrace)).toBe(true);
	});

	it("ignores a body off the sides, in front, behind, below or far above", () => {
		expect(standingOn(middle.add(new Vector3(terrace.width, 0, 0)), terrace)).toBe(false);
		expect(standingOn(new Vector3(0, middle.Y, terrace.frontZ + 1), terrace)).toBe(false);
		expect(standingOn(new Vector3(0, middle.Y, terrace.backZ - 1), terrace)).toBe(false);
		expect(standingOn(middle.sub(new Vector3(0, 10, 0)), terrace)).toBe(false);
		expect(standingOn(middle.add(new Vector3(0, 30, 0)), terrace)).toBe(false);
	});
});

describe("checkpointSpawn", () => {
	const [, terrace] = layoutTerraces([SPACER_FOOTPRINT, SPACER_FOOTPRINT]);

	it("stands the body in the middle of the terrace, on its floor", () => {
		const spawn = checkpointSpawn(terrace, 3);
		expect(spawn.Position.Y).toBe(terrace.floorY + 3);
		expect(standingOn(spawn.Position, terrace)).toBe(true);
	});

	it("faces up the staircase", () => {
		expect(checkpointSpawn(terrace, 3).LookVector.Z).toBeCloseTo(-1);
	});
});
