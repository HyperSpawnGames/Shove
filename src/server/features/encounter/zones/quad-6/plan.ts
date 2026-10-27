import type { RampLayout, TerraceLayout } from "../../world-layout";
import type { ClearZone } from "../types";
import { gateKeepOut, overlaps, rampKeepOut, separation, withinTerrace } from "./geometry";

/**
 * The Chaos zone as data: every part it adds, where, and how it looks, so the
 * rules about where props may go are pure and specced. A cursed violet
 * wasteland: glowing cracks and runes inlaid in dark stone, ritual circles
 * ringed by broken pillars under a hovering void shard, jagged obsidian
 * spikes and floating rock along the terrace sides.
 */

export const MAX_PARTS = 600;
/** Studs every dressing part keeps, seen from above, from the climb, the fights and the gates. */
export const PLAN_GAP = 3;
/** Studs every part keeps in from a terrace's edges. */
export const EDGE_INSET = 1;
/** Seeds each terrace's Random, so the zone looks the same every server. */
const SEED = 6_066;

export type PropShape = "block" | "cylinder";
export type PropEmitter = "mist" | "sparks";

export interface PropLight {
	color: Color3;
	range: number;
	brightness: number;
}

/** One part to build. */
export interface PropSpec {
	name: string;
	/** Which of the zone's terraces it dresses, bottom first. */
	terrace: number;
	cframe: CFrame;
	size: Vector3;
	shape: PropShape;
	color: Color3;
	material: Enum.Material;
	transparency: number;
	collidable: boolean;
	castShadow: boolean;
	/**
	 * A flat glow set into the floor or the cliff face: never collides, and
	 * may lie inside a clear zone. Everything else keeps PLAN_GAP from them.
	 */
	inlay: boolean;
	light?: PropLight;
	emitter?: PropEmitter;
}

export interface ChaosPlanInput {
	terraces: readonly TerraceLayout[];
	ramps: readonly RampLayout[];
	clearZones: readonly ClearZone[];
}

const OBSIDIAN = Color3.fromRGB(30, 18, 42);
const ASH_VIOLET = Color3.fromRGB(62, 46, 78);
const VOID_STONE = Color3.fromRGB(22, 14, 30);
const RUNE_VIOLET = Color3.fromRGB(160, 70, 255);
const RUNE_MAGENTA = Color3.fromRGB(255, 60, 200);
const CRACK_VIOLET = Color3.fromRGB(120, 40, 210);

/** Lays a cylinder part (whose axis is X) upright. */
const UPRIGHT = CFrame.Angles(0, 0, math.pi / 2);

/** A dressing prop's footprint seen from above, so props do not grow into each other. */
interface Disc {
	x: number;
	z: number;
	radius: number;
}

type Draft = Omit<PropSpec, "terrace" | "transparency" | "collidable" | "castShadow" | "inlay" | "shape"> &
	Partial<PropSpec>;

function spec(terrace: number, draft: Draft): PropSpec {
	return {
		shape: "block",
		transparency: 0,
		collidable: false,
		castShadow: true,
		inlay: false,
		...draft,
		terrace,
	};
}

/** The terrace's giant scale, recovered from its width (giantFootprint: 50 + 12 per scale). */
export function zoneScale(layout: TerraceLayout): number {
	return math.max(1, (layout.width - 50) / 12);
}

/** Everything nothing may enter: each terrace's gate wall and each ramp corridor. */
function hardKeepOuts(input: ChaosPlanInput): ClearZone[] {
	return [...input.terraces.map(gateKeepOut), ...input.ramps.map(rampKeepOut)];
}

/** True when a dressing group sits on its terrace and keeps PLAN_GAP from every keep-out, seen from above. */
function dressingFits(layout: TerraceLayout, parts: readonly PropSpec[], keepOuts: readonly ClearZone[]): boolean {
	for (const part of parts) {
		if (!withinTerrace(layout, part.cframe, part.size, EDGE_INSET)) return false;
		for (const zone of keepOuts) if (separation(zone, part.cframe, part.size, true) < PLAN_GAP) return false;
	}
	return true;
}

/** True when an inlay touches no gate wall or ramp corridor. */
function inlayFits(part: PropSpec, hard: readonly ClearZone[]): boolean {
	for (const zone of hard) if (overlaps(zone, part.cframe, part.size)) return false;
	return true;
}

function discFree(discs: readonly Disc[], disc: Disc): boolean {
	for (const other of discs) {
		const dx = other.x - disc.x;
		const dz = other.z - disc.z;
		if (math.sqrt(dx * dx + dz * dz) < other.radius + disc.radius + 1) return false;
	}
	return true;
}

/** A spot in one of the terrace's side bands, where the dressing lives, clear of the lane and the giant. */
function sideSpot(layout: TerraceLayout, rng: Random, margin: number): [number, number] {
	const sign = rng.NextNumber() < 0.5 ? -1 : 1;
	const outer = math.max(layout.width / 2 - margin, layout.width * 0.3);
	const x = sign * rng.NextNumber(layout.width * 0.3, outer);
	const z = rng.NextNumber(layout.backZ + margin, math.max(layout.backZ + margin, layout.frontZ - margin - 3));
	return [x, z];
}

function pillarThickness(k: number): number {
	return math.max(1.2, 0.3 * k);
}

/** A ritual circle: a violet ring and star inlaid in dark stone, broken pillars around it, a void shard above. */
function ritualCircle(terrace: number, floor: Vector3, radius: number, k: number, rng: Random): PropSpec[] {
	const parts: PropSpec[] = [];
	const base = new CFrame(floor);
	parts.push(
		spec(terrace, {
			name: "RitualRing",
			cframe: base.mul(new CFrame(0, 0.03, 0)).mul(UPRIGHT),
			size: new Vector3(0.1, radius * 2, radius * 2),
			shape: "cylinder",
			color: RUNE_VIOLET,
			material: Enum.Material.Neon,
			castShadow: false,
		}),
		spec(terrace, {
			name: "RitualStone",
			cframe: base.mul(new CFrame(0, 0.06, 0)).mul(UPRIGHT),
			size: new Vector3(0.1, radius * 2 - 1.2, radius * 2 - 1.2),
			shape: "cylinder",
			color: VOID_STONE,
			material: Enum.Material.Slate,
			castShadow: false,
		}),
	);

	// A five-pointed star: each point joined to the one two along.
	const turn = rng.NextNumber(0, math.pi * 2);
	const starRadius = radius - 1;
	const point = (i: number) =>
		new Vector3(math.sin(turn + (i * math.pi * 2) / 5), 0, math.cos(turn + (i * math.pi * 2) / 5)).mul(starRadius);
	for (let i = 0; i < 5; i++) {
		const a = point(i);
		const b = point(i + 2);
		const middle = floor.add(a.add(b).mul(0.5)).add(new Vector3(0, 0.09, 0));
		parts.push(
			spec(terrace, {
				name: "RitualStar",
				cframe: CFrame.lookAt(middle, middle.add(b.sub(a))),
				size: new Vector3(math.max(0.3, 0.06 * k), 0.1, b.sub(a).Magnitude),
				color: RUNE_MAGENTA,
				material: Enum.Material.Neon,
				castShadow: false,
			}),
		);
	}

	// Broken pillars between the star's points, some with a fallen drum beside them.
	const thickness = pillarThickness(k);
	for (let i = 0; i < 5; i++) {
		const angle = turn + ((i + 0.5) * math.pi * 2) / 5;
		const out = new Vector3(math.sin(angle), 0, math.cos(angle));
		const foot = floor.add(out.mul(radius + thickness * 0.7));
		const height = k * rng.NextNumber(0.5, 2);
		parts.push(
			spec(terrace, {
				name: "BrokenPillar",
				cframe: new CFrame(foot.add(new Vector3(0, height / 2 - 0.2, 0)))
					.mul(CFrame.Angles(rng.NextNumber(-0.08, 0.08), angle, rng.NextNumber(-0.08, 0.08)))
					.mul(UPRIGHT),
				size: new Vector3(height, thickness, thickness),
				shape: "cylinder",
				color: ASH_VIOLET,
				material: Enum.Material.Slate,
				collidable: true,
			}),
		);
		if (rng.NextNumber() < 0.5) {
			const length = thickness * rng.NextNumber(1, 1.8);
			const along = new Vector3(math.cos(angle), 0, -math.sin(angle)).mul(rng.NextNumber() < 0.5 ? -1 : 1);
			const drum = foot.add(out.mul(thickness * 0.4)).add(along.mul(thickness * 0.6 + length / 2));
			parts.push(
				spec(terrace, {
					name: "FallenDrum",
					cframe: new CFrame(drum.add(new Vector3(0, thickness / 2 - 0.15, 0))).mul(
						CFrame.Angles(0, angle, rng.NextNumber(-0.15, 0.15)),
					),
					size: new Vector3(length, thickness * 0.95, thickness * 0.95),
					shape: "cylinder",
					color: ASH_VIOLET,
					material: Enum.Material.Slate,
					collidable: true,
				}),
			);
		}
	}

	// The void shard: a dark crystal hovering over the star, lit from within.
	parts.push(
		spec(terrace, {
			name: "VoidShard",
			cframe: new CFrame(floor.add(new Vector3(0, 1.6 * k, 0))).mul(
				CFrame.Angles(math.pi / 4, rng.NextNumber(0, math.pi), math.pi / 4),
			),
			size: new Vector3(0.45 * k, 0.9 * k, 0.45 * k),
			color: Color3.fromRGB(70, 20, 110),
			material: Enum.Material.Glass,
			transparency: 0.15,
			light: { color: RUNE_MAGENTA, range: math.min(60, 3 * k + 10), brightness: 2.5 },
			emitter: "sparks",
		}),
		spec(terrace, {
			name: "RitualMist",
			cframe: base.mul(new CFrame(0, 0.5, 0)),
			size: new Vector3(radius * 2, 0.2, radius * 2),
			color: VOID_STONE,
			material: Enum.Material.SmoothPlastic,
			transparency: 1,
			castShadow: false,
			emitter: "mist",
		}),
	);
	return parts;
}

/** A jagged obsidian spike: a leaning shaft and a twisted tip, sunk into the floor. */
function spike(terrace: number, foot: Vector3, height: number, rng: Random, glowing: boolean): PropSpec[] {
	const width = height * rng.NextNumber(0.16, 0.24);
	const shaft = height * 0.62;
	const tip = height * 0.45;
	const base = new CFrame(foot.sub(new Vector3(0, 0.6, 0))).mul(
		CFrame.Angles(rng.NextNumber(-0.3, 0.3), rng.NextNumber(0, math.pi), rng.NextNumber(-0.3, 0.3)),
	);
	return [
		spec(terrace, {
			name: "ObsidianSpike",
			cframe: base.mul(new CFrame(0, shaft / 2, 0)),
			size: new Vector3(width, shaft, width * 0.8),
			color: OBSIDIAN,
			material: Enum.Material.Basalt,
			collidable: true,
		}),
		spec(terrace, {
			name: "ObsidianSpikeTip",
			cframe: base
				.mul(new CFrame(0, shaft + tip / 2 - 0.4, 0))
				.mul(CFrame.Angles(rng.NextNumber(-0.15, 0.15), math.pi / 4, rng.NextNumber(-0.15, 0.15))),
			size: new Vector3(width * 0.55, tip, width * 0.45),
			color: glowing ? RUNE_VIOLET : OBSIDIAN,
			material: glowing ? Enum.Material.Neon : Enum.Material.Basalt,
			collidable: true,
			emitter: glowing ? "sparks" : undefined,
		}),
	];
}

/** Runes inlaid in a ring around the giant's pedestal: two crossed bars each. */
function pedestalRunes(terrace: number, layout: TerraceLayout, k: number, rng: Random): PropSpec[] {
	const parts: PropSpec[] = [];
	const count = 10;
	const ringRadius = 5 * k + 3;
	const length = math.max(2, 0.6 * k);
	const width = math.max(0.35, 0.09 * k);
	const turn = rng.NextNumber(0, math.pi * 2);
	for (let i = 0; i < count; i++) {
		const angle = turn + (i * math.pi * 2) / count;
		const center = layout.giantPosition.add(
			new Vector3(math.sin(angle) * ringRadius, 0.04, math.cos(angle) * ringRadius),
		);
		const facing = new CFrame(center).mul(CFrame.Angles(0, angle, 0));
		const cross = [math.pi / 3, math.pi / 2, -math.pi / 3][rng.NextInteger(0, 2)];
		parts.push(
			spec(terrace, {
				name: "Rune",
				cframe: facing,
				size: new Vector3(width, 0.1, length),
				color: RUNE_VIOLET,
				material: Enum.Material.Neon,
				castShadow: false,
				inlay: true,
			}),
			spec(terrace, {
				name: "Rune",
				cframe: facing.mul(new CFrame(0, 0, rng.NextNumber(-0.25, 0.25) * length)).mul(CFrame.Angles(0, cross, 0)),
				size: new Vector3(width, 0.1, length * 0.6),
				color: RUNE_VIOLET,
				material: Enum.Material.Neon,
				castShadow: false,
				inlay: true,
			}),
		);
	}
	return parts;
}

/** A glowing crack wandering across the floor: three joined segments. */
function floorCrack(terrace: number, layout: TerraceLayout, k: number, rng: Random): PropSpec[] {
	const parts: PropSpec[] = [];
	const width = math.max(0.3, 0.07 * k);
	let at = new Vector3(
		rng.NextNumber(-layout.width / 2 + 4, layout.width / 2 - 4),
		layout.floorY + 0.03,
		rng.NextNumber(layout.backZ + 4, layout.frontZ - 4),
	);
	let heading = rng.NextNumber(0, math.pi * 2);
	for (let i = 0; i < 3; i++) {
		const length = k * rng.NextNumber(1, 2);
		const direction = new Vector3(math.sin(heading), 0, math.cos(heading));
		parts.push(
			spec(terrace, {
				name: "FloorCrack",
				cframe: new CFrame(at.add(direction.mul(length / 2))).mul(CFrame.Angles(0, heading, 0)),
				size: new Vector3(width, 0.1, length + width),
				color: CRACK_VIOLET,
				material: Enum.Material.Neon,
				castShadow: false,
				inlay: true,
			}),
		);
		at = at.add(direction.mul(length));
		heading += rng.NextNumber(-0.9, 0.9);
	}
	return parts;
}

/** A glowing crack running down a raised terrace's front face, beside the ramp. */
function faceCrack(terrace: number, layout: TerraceLayout, k: number, rng: Random): PropSpec[] {
	const parts: PropSpec[] = [];
	const width = math.max(0.4, 0.08 * k);
	const sign = rng.NextNumber() < 0.5 ? -1 : 1;
	let at = new Vector3(sign * rng.NextNumber(16, math.max(16, layout.width / 2 - 6)), layout.floorY - 0.6, 0);
	for (let i = 0; i < 3; i++) {
		const length = rng.NextNumber(3, 5.5);
		const lean = rng.NextNumber(-0.5, 0.5);
		const direction = new Vector3(math.sin(lean), -math.cos(lean), 0);
		const middle = at.add(direction.mul(length / 2));
		parts.push(
			spec(terrace, {
				name: "FaceCrack",
				cframe: new CFrame(middle.X, middle.Y, layout.frontZ + 0.06).mul(CFrame.Angles(0, 0, lean)),
				size: new Vector3(width, length + width, 0.1),
				color: CRACK_VIOLET,
				material: Enum.Material.Neon,
				castShadow: false,
				inlay: true,
			}),
		);
		at = at.add(direction.mul(length));
	}
	return parts;
}

/** One terrace's dressing, in groups, most important first. */
function planTerrace(
	terrace: number,
	layout: TerraceLayout,
	keepOuts: readonly ClearZone[],
	hard: readonly ClearZone[],
): PropSpec[][] {
	const rng = new Random(SEED + terrace);
	const k = zoneScale(layout);
	const groups: PropSpec[][] = [];
	// Footprints on the floor, and in the air above it: a shard may hover over a spike.
	const ground: Disc[] = [];
	const air: Disc[] = [];

	const tryDressing = (layers: Disc[][], disc: Disc, parts: PropSpec[]): boolean => {
		if (!layers.every((discs) => discFree(discs, disc))) return false;
		if (!dressingFits(layout, parts, keepOuts)) return false;
		for (const discs of layers) discs.push(disc);
		groups.push(parts);
		return true;
	};

	// A ritual circle out by each side edge, shrinking until one fits beside the giant.
	for (const side of [-1, 1]) {
		for (let attempt = 0; attempt < 16; attempt++) {
			const radius = math.max(3, k * 1.1 * (1 - attempt * 0.05));
			const reach = radius + pillarThickness(k) * 1.7;
			const x = side * (layout.width / 2 - EDGE_INSET - reach - 0.5);
			const z = rng.NextNumber(layout.backZ + reach + 2, math.max(layout.backZ + reach + 2, layout.frontZ - reach - 6));
			const parts = ritualCircle(terrace, new Vector3(x, layout.floorY, z), radius, k, rng);
			if (tryDressing([ground, air], { x, z, radius: reach }, parts)) break;
		}
	}

	// Obsidian spikes, a few with glowing tips and dark mist curling off their bases.
	let spikes = 0;
	for (let attempt = 0; attempt < 60 && spikes < 12; attempt++) {
		const height = k * rng.NextNumber(1.2, 3.4);
		const [x, z] = sideSpot(layout, rng, 2);
		const parts = spike(terrace, new Vector3(x, layout.floorY, z), height, rng, spikes % 4 === 0);
		if (spikes % 4 === 2) parts[0].emitter = "mist";
		if (tryDressing([ground], { x, z, radius: height * 0.25 }, parts)) spikes += 1;
	}

	// Rock shards hovering over the sides; two carry a faint violet light.
	let shards = 0;
	for (let attempt = 0; attempt < 60 && shards < 8; attempt++) {
		const size = new Vector3(k * rng.NextNumber(0.4, 0.9), k * rng.NextNumber(0.8, 1.6), k * rng.NextNumber(0.4, 0.8));
		const [x, z] = sideSpot(layout, rng, 2);
		const cframe = new CFrame(x, layout.floorY + k * rng.NextNumber(2.2, 4), z).mul(
			CFrame.Angles(rng.NextNumber(0, math.pi), rng.NextNumber(0, math.pi), rng.NextNumber(0, math.pi)),
		);
		const shard = spec(terrace, {
			name: "FloatingShard",
			cframe,
			size,
			color: shards % 2 === 0 ? OBSIDIAN : ASH_VIOLET,
			material: Enum.Material.Basalt,
			light: shards < 2 ? { color: RUNE_VIOLET, range: math.min(40, 2.5 * k), brightness: 1.5 } : undefined,
		});
		const radius = math.max(size.X, size.Y, size.Z) / 2;
		if (tryDressing([air], { x, z, radius }, [shard])) shards += 1;
	}

	const inlays = (parts: PropSpec[]) => {
		const kept = parts.filter((part) => withinTerrace(layout, part.cframe, part.size, 2) && inlayFits(part, hard));
		if (kept.size() > 0) groups.push(kept);
	};
	inlays(pedestalRunes(terrace, layout, k, rng));
	for (let i = 0; i < 6; i++) inlays(floorCrack(terrace, layout, k, rng));
	if (layout.floorY > 0)
		for (let i = 0; i < 3; i++) {
			const parts = faceCrack(terrace, layout, k, rng).filter((part) => inlayFits(part, hard));
			if (parts.size() > 0) groups.push(parts);
		}
	return groups;
}

/**
 * Every part of the Chaos zone. Placement is seeded, so the same staircase
 * always gets the same zone. Each terrace gets an equal share of MAX_PARTS
 * and keeps whole groups, most important first, while they fit.
 */
export function planChaosZone(input: ChaosPlanInput): PropSpec[] {
	const keepOuts = [...input.clearZones, ...hardKeepOuts(input)];
	const hard = hardKeepOuts(input);
	const budget = math.floor(MAX_PARTS / math.max(1, input.terraces.size()));
	const props: PropSpec[] = [];
	input.terraces.forEach((layout, terrace) => {
		let used = 0;
		for (const group of planTerrace(terrace, layout, keepOuts, hard)) {
			if (used + group.size() > budget) continue;
			used += group.size();
			for (const part of group) props.push(part);
		}
	});
	return props;
}
