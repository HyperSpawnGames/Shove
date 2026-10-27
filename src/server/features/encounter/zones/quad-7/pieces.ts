/**
 * The volcanic zone's props as plain data: each generator turns a spot on
 * the floor, a footprint radius and a height into the parts that make the
 * prop, and keeps every part inside that cylinder (pieces.spec.ts). Nothing
 * here touches an Instance; build.ts makes the parts.
 */

export type PieceShape = "block" | "cylinder" | "wedge";
/** A particle effect on a piece: smoke from vents and cones, embers off the lava. */
export type PieceEffect = "smoke" | "embers";

export interface Piece {
	name: string;
	shape: PieceShape;
	size: Vector3;
	cframe: CFrame;
	color: Color3;
	material: Enum.Material;
	/** Lava and glow are walk-through; rock and wood are solid. */
	collide: boolean;
	/** Range of a warm PointLight inside the piece, when it glows. */
	lightRange?: number;
	effect?: PieceEffect;
}

export const LAVA_COLOR = Color3.fromRGB(255, 95, 25);
const LAVA_DEEP_COLOR = Color3.fromRGB(230, 60, 15);
const CRUST_COLOR = Color3.fromRGB(200, 70, 25);
const BASALT_COLORS = [Color3.fromRGB(38, 34, 34), Color3.fromRGB(52, 46, 44), Color3.fromRGB(30, 27, 28)];
const OBSIDIAN_COLOR = Color3.fromRGB(22, 18, 28);
const CHARRED_COLOR = Color3.fromRGB(28, 24, 22);
/** How far a lava surface stands proud of the floor, so it never z-fights. */
const LAVA_LIFT = 0.12;
const LAVA_THICKNESS = 0.4;

/** A Roblox cylinder lies along its X axis; this stands one upright, its base at `base`. */
function upright(base: Vector3, height: number, diameter: number): { cframe: CFrame; size: Vector3 } {
	return {
		cframe: new CFrame(base.add(new Vector3(0, height / 2, 0))).mul(CFrame.Angles(0, 0, math.pi / 2)),
		size: new Vector3(height, diameter, diameter),
	};
}

function pick<T>(rng: Random, options: readonly T[]): T {
	return options[rng.NextInteger(0, options.size() - 1)];
}

/** A flat run of lava from `from` to `to`, both on the floor; overlaps its neighbours at the joints. */
export function lavaRun(name: string, from: Vector3, to: Vector3, width: number): Piece {
	const lift = new Vector3(0, LAVA_LIFT - LAVA_THICKNESS / 2, 0);
	const length = to.sub(from).Magnitude + width / 2;
	const middle = from.Lerp(to, 0.5).add(lift);
	return {
		name,
		shape: "block",
		size: new Vector3(width, LAVA_THICKNESS, length),
		cframe: CFrame.lookAt(middle, to.add(lift)),
		color: LAVA_COLOR,
		material: Enum.Material.Neon,
		collide: false,
	};
}

/** A round pool of lava on a rim of cracked crust, lit and throwing embers. */
export function lavaPool(center: Vector3, diameter: number, crustDiameter: number): Piece[] {
	const pool = upright(center.add(new Vector3(0, LAVA_LIFT + 0.02 - LAVA_THICKNESS, 0)), LAVA_THICKNESS, diameter);
	const crust = upright(center.add(new Vector3(0, 0.05 - LAVA_THICKNESS, 0)), LAVA_THICKNESS, crustDiameter);
	return [
		{
			name: "LavaCrust",
			shape: "cylinder",
			...crust,
			color: CRUST_COLOR,
			material: Enum.Material.CrackedLava,
			collide: false,
		},
		{
			name: "LavaPool",
			shape: "cylinder",
			...pool,
			color: LAVA_DEEP_COLOR,
			material: Enum.Material.Neon,
			collide: false,
			lightRange: 28,
			effect: "embers",
		},
	];
}

/** Lava pouring over a terrace's side face at `lip` (on the edge, at floor height), `drop` studs down. */
export function lavaFall(lip: Vector3, outward: number, drop: number, width: number): Piece {
	return {
		name: "LavaFall",
		shape: "block",
		size: new Vector3(0.6, drop, width),
		cframe: new CFrame(lip.add(new Vector3(outward * 0.3, LAVA_LIFT - drop / 2, 0))),
		color: LAVA_COLOR,
		material: Enum.Material.Neon,
		collide: false,
	};
}

/**
 * A small volcanic cone: three stacked basalt drums narrowing to a glowing,
 * smoking crater. `radius` is the base's; `height` the crater's top.
 */
export function volcanicCone(floor: Vector3, radius: number, height: number, rng: Random): Piece[] {
	const tiers = [
		{ bottom: 0, top: 0.45, diameter: 2 * radius },
		{ bottom: 0.4, top: 0.75, diameter: 1.45 * radius },
		{ bottom: 0.7, top: 0.95, diameter: 0.9 * radius },
	];
	const pieces = tiers.map((tier, index): Piece => {
		const drum = upright(
			floor.add(new Vector3(0, tier.bottom * height, 0)),
			(tier.top - tier.bottom) * height,
			tier.diameter,
		);
		return {
			name: `ConeTier${index + 1}`,
			shape: "cylinder",
			...drum,
			color: pick(rng, BASALT_COLORS),
			material: index === 2 ? Enum.Material.CrackedLava : Enum.Material.Basalt,
			collide: true,
		};
	});
	const crater = upright(floor.add(new Vector3(0, 0.95 * height - 0.2, 0)), 0.4, 0.6 * radius);
	pieces.push({
		name: "ConeCrater",
		shape: "cylinder",
		...crater,
		color: LAVA_COLOR,
		material: Enum.Material.Neon,
		collide: false,
		lightRange: 20,
		effect: "smoke",
	});
	return pieces;
}

/** A low smoking vent: a basalt ring around a glowing mouth. */
export function smokingVent(floor: Vector3, radius: number, rng: Random): Piece[] {
	const ring = upright(floor, 1.2, 2 * radius);
	const mouth = upright(floor.add(new Vector3(0, 1.1, 0)), 0.3, 1.1 * radius);
	return [
		{
			name: "VentRing",
			shape: "cylinder",
			...ring,
			color: pick(rng, BASALT_COLORS),
			material: Enum.Material.Basalt,
			collide: true,
		},
		{
			name: "VentMouth",
			shape: "cylinder",
			...mouth,
			color: LAVA_DEEP_COLOR,
			material: Enum.Material.Neon,
			collide: false,
			lightRange: 10,
			effect: "smoke",
		},
	];
}

/** Height a vent's parts reach above the floor. */
export const VENT_HEIGHT = 1.4;

const BRANCH_THICKNESS = 0.6;
const TRUNK_DIAMETER = 1.4;

/** A charred dead tree: a black trunk with three bare branches reaching up and out. */
export function charredTree(floor: Vector3, radius: number, height: number, rng: Random): Piece[] {
	const trunkHeight = 0.85 * height;
	const trunk = upright(floor, trunkHeight, TRUNK_DIAMETER);
	const pieces: Piece[] = [
		{
			name: "TreeTrunk",
			shape: "cylinder",
			...trunk,
			color: CHARRED_COLOR,
			material: Enum.Material.Wood,
			collide: true,
		},
	];
	const startYaw = rng.NextNumber(0, 2 * math.pi);
	for (let i = 0; i < 3; i++) {
		const yaw = startYaw + (i * 2 * math.pi) / 3 + rng.NextNumber(-0.4, 0.4);
		const pitch = math.rad(rng.NextNumber(25, 55));
		const rootY = trunkHeight * rng.NextNumber(0.5, 0.85);
		// A branch's box reaches its thickness past its line on every side, so the
		// line stops that much short of the footprint and the height.
		const length = math.min(
			(radius - BRANCH_THICKNESS) / math.cos(pitch),
			(height - rootY - BRANCH_THICKNESS) / math.sin(pitch),
			0.6 * height,
		);
		if (length <= 1) continue;
		const direction = new Vector3(math.cos(pitch) * math.cos(yaw), math.sin(pitch), math.cos(pitch) * math.sin(yaw));
		const root = floor.add(new Vector3(0, rootY, 0));
		pieces.push({
			name: "TreeBranch",
			shape: "block",
			size: new Vector3(BRANCH_THICKNESS, BRANCH_THICKNESS, length),
			cframe: CFrame.lookAt(root.add(direction.mul(length / 2)), root.add(direction.mul(length))),
			color: CHARRED_COLOR,
			material: Enum.Material.Wood,
			collide: true,
		});
	}
	return pieces;
}

/** How tall a rock cluster of `radius` can stand: its biggest rock, half sunk. */
export function rockHeight(radius: number): number {
	return 1.7 * 0.65 * radius;
}

/**
 * A cluster of tumbled obsidian and basalt blocks, half sunk into the floor.
 * Each block is sized from the half-diagonal it may have, so however it is
 * turned it stays inside the footprint and under `rockHeight(radius)`.
 */
export function rockCluster(floor: Vector3, radius: number, count: number, rng: Random): Piece[] {
	const shares = [0.65, 0.45, 0.4];
	const pieces: Piece[] = [];
	for (let i = 0; i < math.min(count, shares.size()); i++) {
		const halfDiagonal = shares[i] * radius;
		const reach = rng.NextNumber(0, radius - halfDiagonal);
		const yaw = rng.NextNumber(0, 2 * math.pi);
		const proportions = new Vector3(rng.NextNumber(0.6, 1), rng.NextNumber(0.8, 1.6), rng.NextNumber(0.6, 1));
		const size = proportions.mul((2 * halfDiagonal) / proportions.Magnitude);
		const center = floor.add(new Vector3(math.cos(yaw) * reach, 0.7 * halfDiagonal, math.sin(yaw) * reach));
		const obsidian = i !== 0 || rng.NextNumber() < 0.5;
		pieces.push({
			name: obsidian ? "Obsidian" : "BasaltRock",
			shape: rng.NextNumber() < 0.3 ? "wedge" : "block",
			size,
			cframe: new CFrame(center).mul(
				CFrame.Angles(rng.NextNumber(0, 2 * math.pi), rng.NextNumber(0, 2 * math.pi), rng.NextNumber(0, 2 * math.pi)),
			),
			color: obsidian ? OBSIDIAN_COLOR : pick(rng, BASALT_COLORS),
			material: obsidian ? Enum.Material.Glass : Enum.Material.Basalt,
			collide: true,
		});
	}
	return pieces;
}
