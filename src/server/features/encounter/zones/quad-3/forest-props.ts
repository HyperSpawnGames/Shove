/**
 * The forest's props as data: each is a list of part specs around a ground
 * point, built from a seeded Random and a size unit, so the layout can check
 * every part before anything exists. The zone builder turns specs into Parts.
 */

/** What the builder hangs on a part beyond its looks. */
export type PartEffect = "glow" | "sunbeam" | "fireflies" | "leaves";

export interface PartSpec {
	name: string;
	size: Vector3;
	cframe: CFrame;
	color: Color3;
	material: Enum.Material;
	shape: Enum.PartType;
	/** Collidable props must stay out of every clear zone; decor has collision off. */
	collide: boolean;
	transparency: number;
	castShadow: boolean;
	/** Part of a canopy or a light: high up, so it does not count toward the prop's footprint. */
	overhead: boolean;
	effect?: PartEffect;
}

export interface ForestProp {
	kind: "tree" | "log" | "boulder" | "mushrooms" | "fern" | "moss" | "sunbeam" | "fireflies";
	parts: PartSpec[];
}

const BARK = [Color3.fromRGB(78, 56, 40), Color3.fromRGB(92, 66, 46), Color3.fromRGB(66, 50, 38)];
const LEAVES = [
	Color3.fromRGB(38, 82, 44),
	Color3.fromRGB(48, 98, 50),
	Color3.fromRGB(32, 70, 42),
	Color3.fromRGB(58, 108, 56),
];
const MOSS = Color3.fromRGB(74, 120, 52);
const DEEP_MOSS = Color3.fromRGB(44, 78, 40);
const ROCK = Color3.fromRGB(88, 94, 88);
const FERN = Color3.fromRGB(62, 128, 66);
const CAPS = [Color3.fromRGB(156, 54, 42), Color3.fromRGB(176, 132, 84), Color3.fromRGB(120, 84, 60)];
const STEM = Color3.fromRGB(222, 212, 186);
const GLOW_CAP = Color3.fromRGB(90, 200, 170);
const SUNLIGHT = Color3.fromRGB(255, 240, 190);

function pick<T>(rng: Random, items: readonly T[]): T {
	return items[rng.NextInteger(0, items.size() - 1)];
}

function spec(
	name: string,
	size: Vector3,
	cframe: CFrame,
	color: Color3,
	material: Enum.Material,
	options: Partial<Omit<PartSpec, "name" | "size" | "cframe" | "color" | "material">> = {},
): PartSpec {
	return {
		name,
		size,
		cframe,
		color,
		material,
		shape: options.shape ?? Enum.PartType.Block,
		collide: options.collide ?? true,
		transparency: options.transparency ?? 0,
		castShadow: options.castShadow ?? true,
		overhead: options.overhead ?? false,
		effect: options.effect,
	};
}

/** A Cylinder part stands with its axis along X; this turns it upright. */
const UPRIGHT = CFrame.Angles(0, 0, math.pi / 2);

/** A vertical cylinder of `height` and `diameter` whose base sits at `base`. */
function upright(base: CFrame, height: number, diameter: number): [Vector3, CFrame] {
	return [new Vector3(height, diameter, diameter), base.mul(new CFrame(0, height / 2, 0)).mul(UPRIGHT)];
}

/**
 * A tall tree: a thick mossy-footed trunk with two crossed roots, and three
 * leafy discs stacked into a layered canopy of radius `canopy`, reaching
 * out toward the light along `outward` (a flat unit vector). Its trunk
 * reaches about 32 units.
 */
export function tree(rng: Random, ground: CFrame, unit: number, canopy: number, outward: Vector3): ForestProp {
	const height = rng.NextNumber(28, 38) * unit;
	const trunk = rng.NextNumber(4, 5.5) * unit;
	const bark = pick(rng, BARK);
	const parts: PartSpec[] = [];
	// Round parts stand unturned: a yawed square box would bulge the bounds the layout checks.
	const foot = new CFrame(ground.Position);

	const [trunkSize, trunkFrame] = upright(foot, height, trunk);
	parts.push(spec("Trunk", trunkSize, trunkFrame, bark, Enum.Material.Wood, { shape: Enum.PartType.Cylinder }));
	const [mossSize, mossFrame] = upright(foot, 4 * unit, trunk + 0.6 * unit);
	parts.push(spec("MossBand", mossSize, mossFrame, MOSS, Enum.Material.Grass, { shape: Enum.PartType.Cylinder }));
	const twist = rng.NextNumber(0, math.pi);
	for (const turn of [0, math.pi / 2]) {
		const root = ground.mul(CFrame.Angles(0, twist + turn, 0)).mul(new CFrame(0, 0.6 * unit, 0));
		parts.push(spec("Root", new Vector3(trunk * 1.6, 1.6 * unit, 1.4 * unit), root, bark, Enum.Material.Wood));
	}

	const layers = [
		{ at: 0.58, share: 1, thickness: 4.5 },
		{ at: 0.78, share: 0.78, thickness: 4 },
		{ at: 0.96, share: 0.5, thickness: 3.5 },
	];
	layers.forEach((layer, index) => {
		const diameter = 2 * canopy * layer.share;
		// The crown leans out a third of its radius; each disc drifts a little, never past the crown's edge.
		const slack = canopy * (1 - layer.share) * 0.5;
		const centre = foot
			.add(outward.mul(canopy / 3))
			.add(new Vector3(rng.NextNumber(-slack, slack), height * layer.at, rng.NextNumber(-slack, slack)));
		const thickness = layer.thickness * unit;
		parts.push(
			spec(
				`Canopy${index + 1}`,
				new Vector3(thickness, diameter, diameter),
				centre.mul(UPRIGHT),
				pick(rng, LEAVES),
				Enum.Material.LeafyGrass,
				{
					shape: Enum.PartType.Cylinder,
					collide: false,
					overhead: true,
					effect: index === 0 ? "leaves" : undefined,
				},
			),
		);
	});
	return { kind: "tree", parts };
}

/** A fallen log along `ground`'s look direction, moss down its back and a shelf fungus on one side. */
export function fallenLog(rng: Random, ground: CFrame, unit: number): ForestProp {
	const length = rng.NextNumber(12, 18) * unit;
	const diameter = rng.NextNumber(2.8, 3.8) * unit;
	const axis = ground.mul(new CFrame(0, diameter / 2, 0)).mul(CFrame.Angles(0, math.pi / 2, 0));
	const parts = [
		spec("Log", new Vector3(length, diameter, diameter), axis, pick(rng, BARK), Enum.Material.Wood, {
			shape: Enum.PartType.Cylinder,
		}),
		spec(
			"LogMoss",
			new Vector3(length * 0.7, 0.5 * unit, diameter * 0.6),
			axis.mul(new CFrame(rng.NextNumber(-1, 1) * unit, diameter / 2, 0)),
			MOSS,
			Enum.Material.Grass,
		),
		spec(
			"ShelfFungus",
			new Vector3(0.4 * unit, 2.4 * unit, 2.4 * unit),
			axis.mul(new CFrame(length * 0.2, 0, diameter / 2)).mul(UPRIGHT),
			CAPS[1],
			Enum.Material.SmoothPlastic,
			{ shape: Enum.PartType.Cylinder, collide: false },
		),
	];
	return { kind: "log", parts };
}

/** A grey boulder, slightly tipped, with a cushion of moss on top. */
export function mossyBoulder(rng: Random, ground: CFrame, unit: number): ForestProp {
	const size = new Vector3(rng.NextNumber(5, 8), rng.NextNumber(3.5, 5.5), rng.NextNumber(4.5, 7)).mul(unit);
	const body = ground
		.mul(new CFrame(0, size.Y / 2 - 0.4 * unit, 0))
		.mul(CFrame.Angles(rng.NextNumber(-0.12, 0.12), 0, rng.NextNumber(-0.12, 0.12)));
	return {
		kind: "boulder",
		parts: [
			spec("Boulder", size, body, ROCK, Enum.Material.Slate),
			spec(
				"BoulderMoss",
				new Vector3(size.X * 0.8, 0.6 * unit, size.Z * 0.75),
				body.mul(new CFrame(0, size.Y / 2, 0)),
				MOSS,
				Enum.Material.Grass,
			),
		],
	};
}

/** A cluster of three mushrooms; a glowing cluster has teal neon caps and one soft light. */
export function mushroomCluster(rng: Random, ground: CFrame, unit: number, glowing: boolean): ForestProp {
	const parts: PartSpec[] = [];
	const cap = glowing ? GLOW_CAP : pick(rng, CAPS);
	for (let index = 0; index < 3; index++) {
		const turn = (index / 3) * 2 * math.pi + rng.NextNumber(-0.4, 0.4);
		const spot = ground.mul(CFrame.Angles(0, turn, 0)).mul(new CFrame(index === 0 ? 0 : 1.6 * unit, 0, 0));
		const height = (index === 0 ? rng.NextNumber(3, 4.5) : rng.NextNumber(1.6, 2.8)) * unit;
		const width = height * 0.9;
		const [stemSize, stemFrame] = upright(spot, height, 0.35 * width);
		parts.push(
			spec("Stem", stemSize, stemFrame, STEM, Enum.Material.SmoothPlastic, {
				shape: Enum.PartType.Cylinder,
				collide: false,
			}),
		);
		const [capSize, capFrame] = upright(spot.mul(new CFrame(0, height, 0)), 0.45 * width, width);
		parts.push(
			spec("Cap", capSize, capFrame, cap, glowing ? Enum.Material.Neon : Enum.Material.SmoothPlastic, {
				shape: Enum.PartType.Cylinder,
				collide: false,
				effect: glowing && index === 0 ? "glow" : undefined,
			}),
		);
	}
	return { kind: "mushrooms", parts };
}

/** A fern: four fronds fanning up and out from one root. */
export function fern(rng: Random, ground: CFrame, unit: number): ForestProp {
	const parts: PartSpec[] = [];
	const length = rng.NextNumber(3.5, 5) * unit;
	const twist = rng.NextNumber(0, math.pi);
	for (let index = 0; index < 4; index++) {
		const frond = ground
			.mul(CFrame.Angles(0, twist + (index * math.pi) / 2, 0))
			.mul(CFrame.Angles(math.rad(35), 0, 0))
			.mul(new CFrame(0, 0, -length / 2));
		parts.push(
			spec("Frond", new Vector3(1.4 * unit, 0.2 * unit, length), frond, FERN, Enum.Material.LeafyGrass, {
				collide: false,
				castShadow: false,
			}),
		);
	}
	return { kind: "fern", parts };
}

/** A flat, darker patch of moss on the floor. */
export function mossPatch(rng: Random, ground: CFrame, unit: number): ForestProp {
	const diameter = rng.NextNumber(7, 12) * unit;
	const [size, frame] = upright(ground, 0.2, diameter);
	return {
		kind: "moss",
		parts: [
			spec("MossPatch", size, frame, DEEP_MOSS, Enum.Material.LeafyGrass, {
				shape: Enum.PartType.Cylinder,
				collide: false,
				castShadow: false,
			}),
		],
	};
}

/**
 * A shaft of dappled light slanting down to `ground`: a faint neon beam and,
 * at its top, a hidden lamp holding a soft spotlight.
 */
export function sunbeam(rng: Random, ground: CFrame, unit: number): ForestProp {
	const length = rng.NextNumber(30, 40) * unit;
	const tilt = CFrame.Angles(0, rng.NextNumber(0, 2 * math.pi), 0).mul(
		CFrame.Angles(math.rad(rng.NextNumber(10, 18)), 0, 0),
	);
	const axis = ground.mul(tilt);
	const width = rng.NextNumber(2.5, 4) * unit;
	return {
		kind: "sunbeam",
		parts: [
			spec(
				"Sunbeam",
				new Vector3(width, length, width),
				axis.mul(new CFrame(0, length / 2, 0)),
				SUNLIGHT,
				Enum.Material.Neon,
				{
					collide: false,
					transparency: 0.93,
					castShadow: false,
					overhead: true,
				},
			),
			spec(
				"SunLamp",
				new Vector3(1, 1, 1),
				axis.mul(new CFrame(0, length * 0.8, 0)),
				SUNLIGHT,
				Enum.Material.SmoothPlastic,
				{
					collide: false,
					transparency: 1,
					castShadow: false,
					overhead: true,
					effect: "sunbeam",
				},
			),
		],
	};
}

/** An invisible box of air that fireflies drift in. */
export function fireflies(ground: CFrame, size: Vector3): ForestProp {
	return {
		kind: "fireflies",
		parts: [
			spec("Fireflies", size, ground.mul(new CFrame(0, 2 + size.Y / 2, 0)), SUNLIGHT, Enum.Material.SmoothPlastic, {
				collide: false,
				transparency: 1,
				castShadow: false,
				overhead: true,
				effect: "fireflies",
			}),
		],
	};
}
