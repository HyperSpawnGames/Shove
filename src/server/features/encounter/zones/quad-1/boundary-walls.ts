import type { TerraceLayout } from "../../world-layout";
import type { PartSpec } from "./part-spec";
import { BASEPLATE_HALF, meadowGroundEnd, meadowHalfWidth } from "./plan";

/** The spawn pad's stone, so the walls read as built from the same quarry. */
export const WALL_STONE = Color3.fromRGB(153, 147, 136);
const CAP_STONE = Color3.fromRGB(128, 122, 112);
export const WALL_HEIGHT = 48;
export const WALL_THICKNESS = 8;
/** A pillar stands at every run's ends and about this far apart along it. */
const PILLAR_SPACING = 64;
const PILLAR_SIDE = 13;
const PILLAR_RISE = 8;
const CAP_RISE = 2;

/** One straight run of wall along the X or Z axis, at a fixed position on the other. */
interface Run {
	axis: "X" | "Z";
	/** The run's position on the other axis: the wall's centre line. */
	at: number;
	from: number;
	to: number;
}

function block(name: string, size: Vector3, center: Vector3, color: Color3): PartSpec {
	return {
		group: "BoundaryWalls",
		name,
		shape: "block",
		size,
		cframe: new CFrame(center),
		color,
		material: Enum.Material.Cobblestone,
		collide: true,
	};
}

function buildRun(run: Run): PartSpec[] {
	const length = run.to - run.from;
	if (length <= 0) return [];
	const middle = (run.from + run.to) / 2;
	const along = (value: number, y: number) =>
		run.axis === "X" ? new Vector3(value, y, run.at) : new Vector3(run.at, y, value);
	const sized = (alongLength: number, height: number, across: number) =>
		run.axis === "X" ? new Vector3(alongLength, height, across) : new Vector3(across, height, alongLength);

	const parts = [
		block("Wall", sized(length, WALL_HEIGHT, WALL_THICKNESS), along(middle, WALL_HEIGHT / 2), WALL_STONE),
		block("Cap", sized(length, CAP_RISE, WALL_THICKNESS + 2), along(middle, WALL_HEIGHT + CAP_RISE / 2), CAP_STONE),
	];
	const pillars = math.max(1, math.floor(length / PILLAR_SPACING + 0.5));
	for (let i = 0; i <= pillars; i++) {
		const height = WALL_HEIGHT + PILLAR_RISE;
		parts.push(
			block(
				"Pillar",
				new Vector3(PILLAR_SIDE, height, PILLAR_SIDE),
				along(run.from + (length * i) / pillars, height / 2),
				CAP_STONE,
			),
		);
	}
	return parts;
}

/**
 * Mega walls of the spawn pad's cobblestone round the starting area, just
 * outside the baseplate's edges: behind the spawn, both sides, and across
 * the far edge beside the climb. Where the meadow's ground carries on past
 * the far edge under the staircase, the wall leaves that width open, so the
 * way up is never blocked. Pillars mark every run's ends and stand about
 * PILLAR_SPACING apart; a capstone runs along the top.
 */
export function planBoundaryWalls(terraces: readonly TerraceLayout[]): PartSpec[] {
	if (terraces.size() === 0) return [];
	const edge = BASEPLATE_HALF + WALL_THICKNESS / 2;
	const outer = BASEPLATE_HALF + WALL_THICKNESS;
	const runs: Run[] = [
		{ axis: "X", at: edge, from: -outer, to: outer }, // behind the spawn
		{ axis: "Z", at: -edge, from: -outer, to: outer }, // left side
		{ axis: "Z", at: edge, from: -outer, to: outer }, // right side
	];
	const opening = meadowGroundEnd(terraces) < -BASEPLATE_HALF ? meadowHalfWidth(terraces) : 0;
	if (opening < BASEPLATE_HALF) {
		runs.push({ axis: "X", at: -edge, from: -outer, to: -opening });
		runs.push({ axis: "X", at: -edge, from: opening, to: outer });
	}
	const parts: PartSpec[] = [];
	for (const run of runs) for (const part of buildRun(run)) parts.push(part);
	return parts;
}
