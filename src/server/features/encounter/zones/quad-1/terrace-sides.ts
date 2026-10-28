import type { TerraceLayout } from "../../world-layout";
import type { ClearZone } from "../types";
import { allClear, PartSpec } from "./part-spec";
import { LEAF_GREENS } from "./props";

/**
 * The sides of a raised terrace, dressed as a hillside cut rather than a
 * sheer green wall: a grass lip that overhangs the edge with tufts spilling
 * over it, a band of earth under the lip, weathered rock below that down to
 * the ground, and a few rock outcrops jutting from the faces. Everything
 * hugs the block's own faces; only the outcrops are solid, and each is
 * checked against the keep-clear boxes.
 */

const EARTH = Color3.fromRGB(122, 90, 60);
const ROCK_FACE = Color3.fromRGB(128, 116, 100);
const OUTCROP = [Color3.fromRGB(118, 112, 104), Color3.fromRGB(138, 130, 118)];
/** How far the earth and rock bands stand proud of the block, so they never flicker against it. */
const PROUD = 0.3;
/** The lip's overhang past each edge of the terrace top. */
const LIP_OVERHANG = 0.6;
const LIP_THICKNESS = 1.4;
/** The lip's top sits this far above the floor, under the path (0.14), so the two never flicker. */
const LIP_LIFT = 0.04;
/** Earth under the lip, in studs at k = 1. */
const EARTH_DEPTH = 6;
/** Rock bands run a little into the ground so no seam shows at the foot. */
const FOOT_Y = -1;

/** One vertical face of the block: where it is, which way it looks, and how long it runs. */
interface Face {
	/** Outward unit normal, along X or Z. */
	normal: Vector3;
	/** The face's middle at floor height. */
	center: Vector3;
	/** Unit vector along the face, horizontal. */
	along: Vector3;
	length: number;
	/** Whether the ramp meets this face in the middle (the front and back faces). */
	ramped: boolean;
}

function facesOf(terrace: TerraceLayout): Face[] {
	const halfWidth = terrace.width / 2;
	const depth = terrace.frontZ - terrace.backZ;
	const midZ = (terrace.frontZ + terrace.backZ) / 2;
	const y = terrace.floorY;
	return [
		{
			normal: new Vector3(1, 0, 0),
			center: new Vector3(halfWidth, y, midZ),
			along: new Vector3(0, 0, 1),
			length: depth,
			ramped: false,
		},
		{
			normal: new Vector3(-1, 0, 0),
			center: new Vector3(-halfWidth, y, midZ),
			along: new Vector3(0, 0, 1),
			length: depth,
			ramped: false,
		},
		{
			normal: new Vector3(0, 0, 1),
			center: new Vector3(0, y, terrace.frontZ),
			along: new Vector3(1, 0, 0),
			length: terrace.width,
			ramped: true,
		},
		{
			normal: new Vector3(0, 0, -1),
			center: new Vector3(0, y, terrace.backZ),
			along: new Vector3(1, 0, 0),
			length: terrace.width,
			ramped: true,
		},
	];
}

/** A frame at `position` whose -Z looks out along `normal`, so a part's X runs along the face. */
function facing(position: Vector3, normal: Vector3): CFrame {
	return CFrame.lookAt(position, position.add(normal));
}

/** The middle of a band on `face`, `out` studs off it, spanning `top` to `bottom` in height. */
function bandFrame(face: Face, out: number, top: number, bottom: number): CFrame {
	const middle = face.center.add(face.normal.mul(out));
	return facing(new Vector3(middle.X, (top + bottom) / 2, middle.Z), face.normal);
}

/**
 * The dressing for one raised terrace's sides, in group `group`. `k` is the
 * terrace's prop scale, `lipColor` its grass, `rampHalf` half the width the
 * ramps keep clear (no tufts there, so the ramp lands on a clean edge), and
 * `seed` fixes the variation.
 */
export function planTerraceSides(
	group: string,
	terrace: TerraceLayout,
	k: number,
	lipColor: Color3,
	rampHalf: number,
	keepClear: readonly ClearZone[],
	seed: number,
): PartSpec[] {
	if (terrace.floorY <= 0) return [];
	const rng = new Random(seed);
	const floorY = terrace.floorY;
	const depth = terrace.frontZ - terrace.backZ;
	const parts: PartSpec[] = [];

	parts.push({
		group,
		name: "Lip",
		shape: "block",
		size: new Vector3(terrace.width + 2 * LIP_OVERHANG, LIP_THICKNESS, depth + 2 * LIP_OVERHANG),
		cframe: new CFrame(0, floorY + LIP_LIFT - LIP_THICKNESS / 2, (terrace.frontZ + terrace.backZ) / 2),
		color: lipColor,
		material: Enum.Material.Grass,
		collide: false,
	});

	const earthTop = floorY - LIP_THICKNESS + LIP_LIFT + 0.2;
	const earthBottom = math.max(earthTop - EARTH_DEPTH * k * rng.NextNumber(0.9, 1.1), FOOT_Y + 2);
	for (const face of facesOf(terrace)) {
		// Each band runs past the corners so neighbouring faces' bands meet without a gap.
		const length = face.length + 2 * PROUD + 0.2;
		const bands: [string, number, number, Color3, Enum.Material][] = [
			["Earth", earthTop, earthBottom, EARTH, Enum.Material.Ground],
			["RockFace", earthBottom, FOOT_Y, ROCK_FACE, Enum.Material.Rock],
		];
		for (const [name, top, bottom, color, material] of bands) {
			if (top - bottom <= 0) continue;
			parts.push({
				group,
				name,
				shape: "block",
				size: new Vector3(length, top - bottom, 0.4),
				cframe: bandFrame(face, PROUD - 0.2, top, bottom),
				color,
				material,
				collide: false,
			});
		}

		// Grass tufts spilling over the lip, every few studs, clear of where a ramp meets the edge.
		const spacing = 8 * k;
		const count = math.floor(face.length / spacing);
		for (let i = 0; i < count; i++) {
			const offset = -face.length / 2 + (i + 0.5) * (face.length / count) + rng.NextNumber(-0.25, 0.25) * spacing;
			if (face.ramped && math.abs(offset) < rampHalf + 2) continue;
			if (math.abs(offset) > face.length / 2 - 1) continue;
			const diameter = rng.NextNumber(1.8, 2.6) * k;
			const at = face.center.add(face.normal.mul(LIP_OVERHANG)).add(face.along.mul(offset));
			parts.push({
				group,
				name: "LipTuft",
				shape: "ball",
				size: Vector3.one.mul(diameter),
				cframe: new CFrame(at.X, floorY - diameter * 0.3, at.Z),
				color: LEAF_GREENS[rng.NextInteger(0, LEAF_GREENS.size() - 1)],
				material: Enum.Material.Grass,
				collide: false,
			});
		}

		// Rock outcrops jutting from the face, two on a long side and one either side of a ramp.
		const outcrops = face.ramped ? 2 : 3;
		for (let i = 0; i < outcrops; i++) {
			const size = new Vector3(rng.NextNumber(3, 5), rng.NextNumber(2.2, 3.6), rng.NextNumber(2.5, 4)).mul(k);
			const reach = face.length / 2 - size.Magnitude / 2 - 1;
			let offset = rng.NextNumber(-1, 1) * reach;
			if (face.ramped) offset = (i === 0 ? -1 : 1) * rng.NextNumber(math.min(rampHalf + size.Magnitude, reach), reach);
			const top = floorY - 1.5 - size.Magnitude / 2;
			const y = rng.NextNumber(math.min(2 + size.Magnitude / 2, top), top);
			const out = size.Z * rng.NextNumber(0.15, 0.3);
			const middle = face.center.add(face.normal.mul(out)).add(face.along.mul(offset));
			const outcrop: PartSpec = {
				group,
				name: "Outcrop",
				shape: "block",
				size,
				cframe: facing(new Vector3(middle.X, y, middle.Z), face.normal).mul(
					CFrame.Angles(rng.NextNumber(-0.3, 0.3), rng.NextNumber(-0.4, 0.4), rng.NextNumber(-0.3, 0.3)),
				),
				color: OUTCROP[rng.NextInteger(0, OUTCROP.size() - 1)],
				material: Enum.Material.Slate,
				collide: true,
			};
			if (allClear([outcrop], keepClear)) parts.push(outcrop);
		}
	}
	return parts;
}
