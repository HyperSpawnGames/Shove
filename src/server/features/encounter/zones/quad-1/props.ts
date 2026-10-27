import type { PartSpec } from "./part-spec";

/**
 * The Grassland's props as Part specs. Each builder takes the point on the
 * floor the prop stands on and `k`, the zone's size factor (1 on the first
 * terrace), and draws its variation from `rng`, so a seeded Random gives
 * the same prop every run.
 */

export const LEAF_GREENS = [Color3.fromRGB(78, 150, 62), Color3.fromRGB(96, 168, 70), Color3.fromRGB(122, 178, 72)];
export const BUSH_GREENS = [Color3.fromRGB(62, 128, 56), Color3.fromRGB(74, 142, 60)];
export const HILL_GREENS = [Color3.fromRGB(98, 168, 70), Color3.fromRGB(110, 178, 74), Color3.fromRGB(90, 158, 66)];
const FLOWER_COLORS = [
	Color3.fromRGB(255, 214, 64),
	Color3.fromRGB(255, 255, 245),
	Color3.fromRGB(255, 130, 170),
	Color3.fromRGB(170, 120, 230),
	Color3.fromRGB(255, 150, 70),
];
const BARK = Color3.fromRGB(110, 78, 50);
const FENCE_WOOD = Color3.fromRGB(150, 108, 66);
const STONE = [Color3.fromRGB(140, 140, 132), Color3.fromRGB(122, 124, 118)];
const PATH_DIRT = Color3.fromRGB(156, 122, 80);

/** How far each prop reaches from its base on the floor, for spacing props apart. */
export const PROP_RADIUS = { tree: 4.5, bush: 2.6, rock: 2.6, flowers: 1.3, sign: 3.5 };

function pick<T>(rng: Random, list: readonly T[]): T {
	return list[rng.NextInteger(0, list.size() - 1)];
}

/** A vertical cylinder: the engine's runs along X, so it is turned onto Y. */
function upright(center: Vector3): CFrame {
	return new CFrame(center).mul(CFrame.Angles(0, 0, math.pi / 2));
}

/** A low, round tree: a stout trunk under three leafy balls. */
export function tree(group: string, base: Vector3, k: number, rng: Random): PartSpec[] {
	const s = k * rng.NextNumber(0.85, 1.15);
	const trunkHeight = 4.5 * s;
	const trunkWidth = 1.4 * s;
	const yaw = rng.NextNumber(0, 2 * math.pi);
	const top = base.add(new Vector3(0, trunkHeight, 0));
	const around = CFrame.Angles(0, yaw, 0);
	const leaf = pick(rng, LEAF_GREENS);
	const parts: PartSpec[] = [
		{
			group,
			name: "Trunk",
			shape: "cylinder",
			size: new Vector3(trunkHeight + 0.6 * s, trunkWidth, trunkWidth),
			cframe: upright(base.add(new Vector3(0, (trunkHeight + 0.6 * s) / 2 - 0.3 * s, 0))),
			color: BARK,
			material: Enum.Material.Wood,
			collide: true,
		},
		{
			group,
			name: "Crown",
			shape: "ball",
			size: Vector3.one.mul(6.4 * s),
			cframe: new CFrame(top.add(new Vector3(0, 1.8 * s, 0))),
			color: leaf,
			material: Enum.Material.LeafyGrass,
			collide: true,
		},
	];
	for (const side of [-1, 1]) {
		const offset = around.VectorToWorldSpace(new Vector3(side * 2.2 * s, 0.6 * s, side * 0.8 * s));
		parts.push({
			group,
			name: "Leaves",
			shape: "ball",
			size: Vector3.one.mul(4.4 * s),
			cframe: new CFrame(top.add(offset)),
			color: pick(rng, LEAF_GREENS),
			material: Enum.Material.LeafyGrass,
			collide: true,
		});
	}
	return parts;
}

/** Two or three green balls half sunk into the grass. */
export function bush(group: string, base: Vector3, k: number, rng: Random): PartSpec[] {
	const parts: PartSpec[] = [];
	const count = rng.NextInteger(2, 3);
	const yaw = rng.NextNumber(0, 2 * math.pi);
	for (let i = 0; i < count; i++) {
		const diameter = k * rng.NextNumber(2.6, 3.8);
		const offset = CFrame.Angles(0, yaw + (i * 2 * math.pi) / count, 0).VectorToWorldSpace(
			new Vector3(i === 0 ? 0 : 1.2 * k, 0, 0),
		);
		parts.push({
			group,
			name: "Bush",
			shape: "ball",
			size: Vector3.one.mul(diameter),
			cframe: new CFrame(base.add(offset).add(new Vector3(0, diameter * 0.25, 0))),
			color: pick(rng, BUSH_GREENS),
			material: Enum.Material.Grass,
			collide: true,
		});
	}
	return parts;
}

/** A tilted boulder, sometimes with a smaller one beside it. */
export function rock(group: string, base: Vector3, k: number, rng: Random): PartSpec[] {
	const parts: PartSpec[] = [];
	const count = rng.NextNumber() < 0.5 ? 1 : 2;
	for (let i = 0; i < count; i++) {
		const s = k * (i === 0 ? 1 : 0.55);
		const size = new Vector3(rng.NextNumber(2.4, 3.6), rng.NextNumber(1.4, 2.4), rng.NextNumber(2, 3.2)).mul(s);
		const offset = i === 0 ? Vector3.zero : new Vector3(rng.NextNumber(-1, 1), 0, rng.NextNumber(-1, 1)).mul(2 * k);
		parts.push({
			group,
			name: "Rock",
			shape: "block",
			size,
			cframe: new CFrame(base.add(offset).add(new Vector3(0, size.Y * 0.3, 0))).mul(
				CFrame.Angles(rng.NextNumber(-0.25, 0.25), rng.NextNumber(0, 2 * math.pi), rng.NextNumber(-0.25, 0.25)),
			),
			color: pick(rng, STONE),
			material: Enum.Material.Slate,
			collide: true,
		});
	}
	return parts;
}

/** A tuft of grass with a few bright flower heads; nothing here is solid. */
export function flowers(group: string, base: Vector3, k: number, rng: Random, pollen: boolean): PartSpec[] {
	const tuft = 1.6 * k;
	const parts: PartSpec[] = [
		{
			group,
			name: "Tuft",
			shape: "ball",
			size: Vector3.one.mul(tuft),
			cframe: new CFrame(base.add(new Vector3(0, tuft * 0.2, 0))),
			color: pick(rng, LEAF_GREENS),
			material: Enum.Material.Grass,
			collide: false,
			pollen,
		},
	];
	const color = pick(rng, FLOWER_COLORS);
	const heads = rng.NextInteger(3, 4);
	for (let i = 0; i < heads; i++) {
		const angle = (i * 2 * math.pi) / heads + rng.NextNumber(-0.4, 0.4);
		const reach = rng.NextNumber(0.4, 0.9) * k;
		parts.push({
			group,
			name: "Flower",
			shape: "ball",
			size: Vector3.one.mul(0.6 * k),
			cframe: new CFrame(
				base.add(new Vector3(math.cos(angle) * reach, rng.NextNumber(0.8, 1.2) * k, math.sin(angle) * reach)),
			),
			color: i === heads - 1 ? pick(rng, FLOWER_COLORS) : color,
			material: Enum.Material.SmoothPlastic,
			collide: false,
		});
	}
	return parts;
}

/**
 * A split-rail fence from `from` to `to` along the floor: a post every
 * `spacing` studs or so and two rails the whole way.
 */
export function fence(group: string, from: Vector3, to: Vector3, k: number): PartSpec[] {
	const length = to.sub(from).Magnitude;
	const along = CFrame.lookAt(from, to);
	const postHeight = 3.2 * k;
	const posts = math.max(2, math.floor(length / (8 * k)) + 1);
	const parts: PartSpec[] = [];
	for (let i = 0; i < posts; i++) {
		const at = from.Lerp(to, i / (posts - 1));
		parts.push({
			group,
			name: "Post",
			shape: "block",
			size: new Vector3(0.7 * k, postHeight, 0.7 * k),
			cframe: along.Rotation.add(at.add(new Vector3(0, postHeight / 2, 0))),
			color: FENCE_WOOD,
			material: Enum.Material.Wood,
			collide: true,
		});
	}
	for (const height of [1.2, 2.4]) {
		parts.push({
			group,
			name: "Rail",
			shape: "block",
			size: new Vector3(0.3 * k, 0.45 * k, length),
			cframe: along.Rotation.add(from.Lerp(to, 0.5).add(new Vector3(0, height * k, 0))),
			color: FENCE_WOOD,
			material: Enum.Material.Wood,
			collide: true,
		});
	}
	return parts;
}

/**
 * A wooden signpost: a board facing the spawn that names what is ahead, and
 * an arrow plank on top pointing up the staircase (-Z).
 */
export function signpost(group: string, base: Vector3, k: number): PartSpec[] {
	const postHeight = 7 * k;
	const arrowY = postHeight - 0.4 * k;
	const arrowLength = 5 * k;
	return [
		{
			group,
			name: "Post",
			shape: "block",
			size: new Vector3(0.7 * k, postHeight, 0.7 * k),
			cframe: new CFrame(base.add(new Vector3(0, postHeight / 2, 0))),
			color: BARK,
			material: Enum.Material.Wood,
			collide: true,
		},
		{
			group,
			name: "Board",
			shape: "block",
			size: new Vector3(6 * k, 2.4 * k, 0.35 * k),
			cframe: new CFrame(base.add(new Vector3(0, 4.2 * k, 0.5 * k))),
			color: FENCE_WOOD,
			material: Enum.Material.Wood,
			collide: true,
			sign: "GIANTS\nup the hill!",
		},
		{
			group,
			name: "Arrow",
			shape: "block",
			size: new Vector3(0.35 * k, 1.1 * k, arrowLength),
			cframe: new CFrame(base.add(new Vector3(0, arrowY, -arrowLength / 2 + 0.6 * k))),
			color: FENCE_WOOD,
			material: Enum.Material.Wood,
			collide: true,
		},
		{
			group,
			name: "ArrowTip",
			shape: "block",
			size: new Vector3(0.35 * k, 1.5 * k, 1.5 * k),
			cframe: new CFrame(base.add(new Vector3(0, arrowY, -arrowLength + 0.6 * k))).mul(
				CFrame.Angles(math.pi / 4, 0, 0),
			),
			color: FENCE_WOOD,
			material: Enum.Material.Wood,
			collide: true,
		},
	];
}

/**
 * A dome of grass rising `height` studs from the ground at `base`, with a
 * footprint `capRadius` across: a big ball, mostly buried.
 */
export function hill(group: string, base: Vector3, capRadius: number, height: number, color: Color3): PartSpec {
	const radius = (capRadius * capRadius + height * height) / (2 * height);
	return {
		group,
		name: "Hill",
		shape: "ball",
		size: Vector3.one.mul(2 * radius),
		cframe: new CFrame(base.add(new Vector3(0, height - radius, 0))),
		color,
		material: Enum.Material.Grass,
		collide: true,
	};
}

/** The height of a hill's surface above its base at `offset` studs from its middle, or undefined off the dome. */
export function hillSurface(capRadius: number, height: number, offset: number): number | undefined {
	if (offset >= capRadius) return undefined;
	const radius = (capRadius * capRadius + height * height) / (2 * height);
	return height - radius + math.sqrt(radius * radius - offset * offset);
}

/** A strip of trodden dirt along the walking lane, flush on the floor and not solid. */
export function path(group: string, floorY: number, frontZ: number, backZ: number, width: number): PartSpec {
	const thickness = 0.4;
	return {
		group,
		name: "Path",
		shape: "block",
		size: new Vector3(width, thickness, frontZ - backZ),
		cframe: new CFrame(0, floorY + 0.14 - thickness / 2, (frontZ + backZ) / 2),
		color: PATH_DIRT,
		material: Enum.Material.Ground,
		collide: false,
	};
}
