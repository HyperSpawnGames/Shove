import { describe, expect, it } from "@rbxts/jest-globals";
import { RIDGE_CONFIG } from "./ridge-config";
import { hasShops, layoutRidge, SURFACE_THICKNESS, terraceIndexAt } from "./ridge-layout";

const config = RIDGE_CONFIG;
const layout = layoutRidge(config);
const terraces = layout.terraces;
const last = terraces[terraces.size() - 1];

describe("layoutRidge", () => {
	it("lays out the base plus one terrace per giant, indexed by position", () => {
		expect(terraces.size()).toBe(config.terraceCount + 1);
		terraces.forEach((terrace, i) => expect(terrace.index).toBe(i));
	});

	it("builds the base and terrace 1 for a 1× player and the summit for a 10× one", () => {
		expect(terraces[0].arrivalHeight).toBe(config.playerHeight);
		expect(terraces[1].arrivalHeight).toBe(config.playerHeight);
		expect(last.arrivalScale).toBeCloseTo(10);
	});

	it("grows each terrace by the growth ratio", () => {
		for (let i = 2; i < terraces.size(); i++) {
			expect(terraces[i].arrivalScale / terraces[i - 1].arrivalScale).toBeCloseTo(config.growth);
			expect(terraces[i].width / terraces[i - 1].width).toBeCloseTo(config.growth);
		}
	});

	it("puts the base's top cliffDrop above the valley and ends it at z = 0", () => {
		expect(terraces[0].topY).toBe(layout.valleyY + config.cliffDrop * config.playerHeight);
		expect(terraces[0].backZ).toBeCloseTo(0);
	});

	it("starts each terrace where the previous one ends, one riser higher", () => {
		for (let i = 1; i < terraces.size(); i++) {
			const previous = terraces[i - 1];
			expect(terraces[i].frontZ).toBe(previous.backZ);
			expect(terraces[i].topY - previous.topY).toBeCloseTo(config.stepHeight * previous.arrivalHeight);
		}
	});

	it("runs each ramp from this terrace's top to the next one's front edge", () => {
		for (let i = 0; i < terraces.size() - 1; i++) {
			const terrace = terraces[i];
			const ramp = terrace.ramp!;
			const bottom = ramp.center.Y - ramp.size.Y / 2;
			const top = ramp.center.Y + ramp.size.Y / 2;
			expect(bottom).toBeCloseTo(terrace.topY);
			expect(top).toBeCloseTo(terraces[i + 1].topY);
			expect(ramp.center.Z + ramp.size.Z / 2).toBeCloseTo(terrace.backZ);
			expect(ramp.center.Z - ramp.size.Z / 2 >= terrace.frontZ).toBe(true);
			expect(math.abs(ramp.center.X) + ramp.size.X / 2 <= terrace.width / 2).toBe(true);
		}
	});

	it("keeps each ramp at the configured slope", () => {
		const ramp = terraces[5].ramp!;
		expect(math.deg(math.atan(ramp.size.Y / ramp.size.Z))).toBeCloseTo(config.rampSlopeDegrees);
	});

	it("gives the summit no ramp and no barrier", () => {
		expect(last.ramp).toBeUndefined();
		expect(last.barrier).toBeUndefined();
	});

	it("covers each top with surface slabs, front to back, with no gaps", () => {
		for (const terrace of terraces) {
			// Pushed one by one: a Luau array cannot hold an undefined in the middle.
			const slabs = [terrace.arrival];
			if (terrace.shops) slabs.push(terrace.shops);
			if (terrace.fight) slabs.push(terrace.fight.lane);
			slabs.push(terrace.back);
			let z = terrace.frontZ;
			for (const slab of slabs) {
				expect(slab.center.Z - slab.size.Z / 2).toBeCloseTo(z);
				expect(slab.center.Y + slab.size.Y / 2).toBeCloseTo(terrace.topY);
				z = slab.center.Z + slab.size.Z / 2;
			}
			expect(z).toBeCloseTo(terrace.backZ);
			expect(terrace.block.center.Y + terrace.block.size.Y / 2).toBeCloseTo(terrace.topY - SURFACE_THICKNESS);
		}
	});

	it("gives shops to the base and to terraces 5, 9, …, 25", () => {
		const withShops = terraces.filter((terrace) => terrace.shops !== undefined).map((terrace) => terrace.index);
		expect(withShops).toEqual([0, 5, 9, 13, 17, 21, 25]);
		for (const terrace of terraces) {
			expect(terrace.shopStands.size()).toBe(hasShops(config, terrace.index) ? 3 : 0);
		}
	});

	it("puts the player left and the giant right of centre on the lane", () => {
		for (const terrace of terraces) {
			if (terrace.index === 0) {
				expect(terrace.fight).toBeUndefined();
				continue;
			}
			const fight = terrace.fight!;
			expect(fight.playerMark.X < 0).toBe(true);
			expect(fight.giantMark.X > 0).toBe(true);
			expect(fight.giantHeight).toBeCloseTo(config.giantToPlayer * terrace.arrivalHeight);
			expect(fight.giantMark.Y).toBeCloseTo(terrace.topY);
		}
	});

	it("throws each giant to land throwClearance giant heights past the +X cliff edge", () => {
		for (const terrace of terraces) {
			if (terrace.fight === undefined) continue;
			const fight = terrace.fight;
			const landingX = fight.giantMark.X + fight.throwDistance;
			expect(landingX - terrace.width / 2).toBeCloseTo(config.throwClearance * fight.giantHeight, 3);
		}
	});

	it("places a spawn point on the arrival zone", () => {
		for (const terrace of terraces) {
			expect(terrace.arrivalPoint.Y).toBeCloseTo(terrace.topY);
			expect(terrace.arrivalPoint.Z > terrace.frontZ && terrace.arrivalPoint.Z < terrace.backZ).toBe(true);
		}
	});

	it("puts the valley floor under the whole ridge", () => {
		const valley = layout.valley;
		expect(valley.center.Y + valley.size.Y / 2).toBe(layout.valleyY);
		expect(valley.center.Z - valley.size.Z / 2 < terraces[0].frontZ).toBe(true);
		expect(valley.center.Z + valley.size.Z / 2 > last.backZ).toBe(true);
		expect(valley.size.X > last.width).toBe(true);
	});
});

describe("terraceIndexAt", () => {
	it("finds the terrace whose footprint holds z", () => {
		expect(terraceIndexAt(layout, -1)).toBe(0);
		expect(terraceIndexAt(layout, 1)).toBe(1);
		const seventh = terraces[7];
		expect(terraceIndexAt(layout, (seventh.frontZ + seventh.backZ) / 2)).toBe(7);
		expect(terraceIndexAt(layout, seventh.backZ)).toBe(8);
	});

	it("clamps to the base in front of the ridge and the summit beyond it", () => {
		expect(terraceIndexAt(layout, -1e6)).toBe(0);
		expect(terraceIndexAt(layout, 1e6)).toBe(config.terraceCount);
	});
});
