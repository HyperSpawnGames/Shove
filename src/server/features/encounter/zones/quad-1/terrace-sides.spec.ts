import { describe, expect, it } from "@rbxts/jest-globals";
import { giantFootprint, layoutTerraces, RAMP_RUN, rampBetween } from "../../world-layout";
import type { ClearZone } from "../types";
import { allClear } from "./part-spec";
import { rampCorridor } from "./plan";
import { planTerraceSides } from "./terrace-sides";

const terraces = layoutTerraces([1.6, 2, 2.5, 3].map((scale) => giantFootprint(scale)));
const RAMP_HALF = 11;

/** Every ramp onto and off each terrace, plus each terrace's lane: the paths a side prop could block. */
function paths(): ClearZone[] {
	const zones: ClearZone[] = [];
	terraces.forEach((terrace, i) => {
		if (i > 0) {
			const ramp = rampBetween(terraces[i - 1], terrace);
			zones.push(rampCorridor(ramp.from, ramp.to));
		}
		zones.push({
			cframe: new CFrame(0, terrace.floorY + 6, (terrace.frontZ + terrace.backZ) / 2),
			size: new Vector3(20, 12, terrace.frontZ - terrace.backZ),
		});
	});
	const last = terraces[terraces.size() - 1];
	zones.push(
		rampCorridor(new Vector3(0, last.floorY, last.backZ), new Vector3(0, last.floorY + 20, last.backZ - RAMP_RUN)),
	);
	return zones;
}

describe("planTerraceSides", () => {
	const keepClear = paths();
	const plans = terraces.map((terrace, i) =>
		planTerraceSides(`Terrace${i + 1}`, terrace, 1, new Color3(0, 1, 0), RAMP_HALF, keepClear, i),
	);

	it("leaves the ground terrace alone", () => {
		expect(plans[0].size()).toBe(0);
	});

	it("dresses every raised terrace's sides with a lip, earth, rock and outcrops", () => {
		for (let i = 1; i < plans.size(); i++) {
			for (const name of ["Lip", "Earth", "RockFace", "LipTuft", "Outcrop"])
				expect(plans[i].some((part) => part.name === name)).toBe(true);
		}
	});

	it("makes only the outcrops solid, and keeps them off every ramp and lane", () => {
		for (const plan of plans) {
			for (const part of plan) {
				if (!part.collide) continue;
				expect(part.name).toBe("Outcrop");
				expect(allClear([part], keepClear)).toBe(true);
			}
		}
	});

	it("keeps outcrops below the terrace's floor, so none can be stood on from the top", () => {
		plans.forEach((plan, i) => {
			for (const part of plan.filter((p) => p.name === "Outcrop"))
				expect(part.cframe.Position.Y + part.size.Magnitude / 2).toBeLessThan(terraces[i].floorY);
		});
	});

	it("hugs the terrace: nothing strays more than a few studs off its faces", () => {
		plans.forEach((plan, i) => {
			const terrace = terraces[i];
			for (const part of plan) {
				const p = part.cframe.Position;
				expect(math.abs(p.X)).toBeLessThan(terrace.width / 2 + 4);
				expect(p.Z).toBeLessThan(terrace.frontZ + 4);
				expect(p.Z).toBeGreaterThan(terrace.backZ - 4);
				expect(p.Y).toBeLessThan(terrace.floorY + 1);
			}
		});
	});

	it("keeps lip tufts off the middle of the front and back edges, where the ramps meet them", () => {
		plans.forEach((plan, i) => {
			const terrace = terraces[i];
			for (const part of plan.filter((p) => p.name === "LipTuft")) {
				const p = part.cframe.Position;
				const onEnd = p.Z > terrace.frontZ || p.Z < terrace.backZ;
				if (onEnd) expect(math.abs(p.X)).toBeGreaterThan(RAMP_HALF);
			}
		});
	});

	it("is the same every run", () => {
		const again = planTerraceSides("Terrace2", terraces[1], 1, new Color3(0, 1, 0), RAMP_HALF, keepClear, 1);
		expect(again.size()).toBe(plans[1].size());
		again.forEach((part, j) => expect(part.cframe.Position.sub(plans[1][j].cframe.Position).Magnitude).toBe(0));
	});
});
