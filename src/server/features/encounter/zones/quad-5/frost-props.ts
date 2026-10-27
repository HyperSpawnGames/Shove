/**
 * The frost zone's props as data: each is a list of part specs around a
 * ground point, built from a seeded Random and a size unit, so the layout can
 * check every part before anything exists. The zone builder turns specs into
 * Parts.
 */

/** What the builder hangs on a part beyond its looks. */
export type PartEffect = "crystalGlow" | "snowfall";

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
	/** Tall enough to block a view: keeps the wider VIEW_MARGIN from the clear zones. */
	tall: boolean;
	effect?: PartEffect;
}

export interface FrostProp {
	kind: "spire" | "pine" | "crystals" | "boulder" | "pond" | "drift" | "icicles" | "snowfall";
	parts: PartSpec[];
}

export const SNOW = Color3.fromRGB(236, 243, 252);
const SNOW_SHADE = Color3.fromRGB(214, 228, 245);
const ICE = [Color3.fromRGB(176, 228, 250), Color3.fromRGB(160, 214, 244), Color3.fromRGB(196, 238, 252)];
const CRYSTAL = [Color3.fromRGB(150, 226, 255), Color3.fromRGB(128, 206, 250), Color3.fromRGB(176, 240, 255)];
const PINE = [Color3.fromRGB(34, 74, 62), Color3.fromRGB(40, 84, 70), Color3.fromRGB(30, 66, 58)];
const BARK = Color3.fromRGB(78, 62, 54);
const ROCK = [Color3.fromRGB(112, 126, 142), Color3.fromRGB(98, 112, 130), Color3.fromRGB(124, 138, 152)];
const POND = Color3.fromRGB(150, 205, 235);

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
		tall: options.tall ?? false,
		effect: options.effect,
	};
}

/** A Cylinder part lies with its axis along X; this stands it upright. */
const UPRIGHT = CFrame.Angles(0, 0, math.pi / 2);

/** A flat disc of `diameter` and `thickness` whose underside sits at `base`. */
function disc(base: CFrame, thickness: number, diameter: number): [Vector3, CFrame] {
	return [new Vector3(thickness, diameter, diameter), base.mul(new CFrame(0, thickness / 2, 0)).mul(UPRIGHT)];
}

/**
 * A ridge of two Wedges back to back, `width` across X, `depth` across Z and
 * `height` tall, its base centred on `base`. A WedgePart's slope is its front
 * (-Z) face, so a wedge rises toward +Z; the second is turned to face it.
 */
function ridge(
	name: string,
	base: CFrame,
	width: number,
	height: number,
	depth: number,
	color: Color3,
	material: Enum.Material,
	options: Partial<Omit<PartSpec, "name" | "size" | "cframe" | "color" | "material">> = {},
): PartSpec[] {
	const size = new Vector3(width, height, depth / 2);
	const middle = base.mul(new CFrame(0, height / 2, 0));
	return [
		spec(name, size, middle.mul(new CFrame(0, 0, -depth / 4)), color, material, {
			...options,
			shape: Enum.PartType.Wedge,
		}),
		spec(name, size, middle.mul(new CFrame(0, 0, depth / 4)).mul(CFrame.Angles(0, math.pi, 0)), color, material, {
			...options,
			shape: Enum.PartType.Wedge,
		}),
	];
}

/**
 * One ice shard along `axis`'s up vector from its base: a square shaft and a
 * pointed ridge tip. Three parts.
 */
function shard(
	name: string,
	axis: CFrame,
	width: number,
	length: number,
	color: Color3,
	material: Enum.Material,
	transparency: number,
	options: { tall?: boolean; effect?: PartEffect } = {},
): PartSpec[] {
	const shaft = length * 0.78;
	return [
		spec(name, new Vector3(width, shaft, width), axis.mul(new CFrame(0, shaft / 2, 0)), color, material, {
			transparency,
			tall: options.tall,
			effect: options.effect,
		}),
		...ridge(`${name}Tip`, axis.mul(new CFrame(0, shaft, 0)), width, length - shaft, width, color, material, {
			transparency,
			tall: options.tall,
		}),
	];
}

/** Tilts a ground frame `lean` radians away from its centre, toward `turn` around it, and sinks it a little. */
function leaning(ground: CFrame, turn: number, lean: number, offset: number, sink: number): CFrame {
	return ground
		.mul(CFrame.Angles(0, turn, 0))
		.mul(new CFrame(offset, -sink, 0))
		.mul(CFrame.Angles(0, 0, -lean));
}

/**
 * A jagged ice spire: a tall, slightly tipped column narrowing in two steps
 * to a point, with two smaller shards leaning off its foot. Ten parts.
 */
export function iceSpire(rng: Random, ground: CFrame, unit: number): FrostProp {
	const height = rng.NextNumber(30, 42) * unit;
	const width = rng.NextNumber(5, 7) * unit;
	const color = pick(rng, ICE);
	const tilt = rng.NextNumber(-0.08, 0.08);
	const foot = ground
		.mul(new CFrame(0, -(width / 2) * math.abs(math.sin(tilt)) - 0.2, 0))
		.mul(CFrame.Angles(tilt, 0, 0));
	const lower = height * 0.5;
	const parts: PartSpec[] = [
		spec("Spire", new Vector3(width, lower, width), foot.mul(new CFrame(0, lower / 2, 0)), color, Enum.Material.Ice, {
			transparency: 0.15,
			tall: true,
		}),
		// The upper column is turned 45 degrees, so the spire reads as faceted, not stacked.
		...shard(
			"SpireTop",
			foot.mul(new CFrame(0, lower - 0.5 * unit, 0)).mul(CFrame.Angles(0, math.pi / 4, 0)),
			width * 0.62,
			height - lower + 0.5 * unit,
			color,
			Enum.Material.Ice,
			0.15,
			{ tall: true },
		),
	];
	const turn = rng.NextNumber(0, 2 * math.pi);
	for (const side of [0, 1]) {
		const length = rng.NextNumber(6, 10) * unit;
		const axis = leaning(
			ground,
			turn + side * rng.NextNumber(2.2, 4),
			rng.NextNumber(0.25, 0.4),
			width * 0.55,
			0.5 * unit,
		);
		for (const piece of shard("SpireShard", axis, width * 0.38, length, pick(rng, ICE), Enum.Material.Ice, 0.2)) {
			parts.push(piece);
		}
	}
	return { kind: "spire", parts };
}

/**
 * A snow-covered pine: a short trunk under four tiers of needles, each turned
 * 45 degrees from the last, with snow lying on each. Nine parts; only the
 * trunk is solid.
 */
export function snowyPine(rng: Random, ground: CFrame, unit: number): FrostProp {
	const height = rng.NextNumber(22, 30) * unit;
	const spread = rng.NextNumber(7, 10) * unit;
	const trunkHeight = height * 0.22;
	const trunk = 1.8 * unit;
	const needles = pick(rng, PINE);
	const foot = new CFrame(ground.Position);
	const parts: PartSpec[] = [
		spec(
			"Trunk",
			new Vector3(trunkHeight + unit, trunk, trunk),
			foot.mul(new CFrame(0, (trunkHeight + unit) / 2, 0)).mul(UPRIGHT),
			BARK,
			Enum.Material.Wood,
			{ shape: Enum.PartType.Cylinder },
		),
	];
	const tiers = 4;
	const tierHeight = (height - trunkHeight) / tiers;
	const twist = rng.NextNumber(0, math.pi / 4);
	for (let index = 0; index < tiers; index++) {
		const share = 1 - index * 0.22;
		const across = spread * share;
		const bottom = trunkHeight + index * tierHeight * 0.92;
		const frame = foot.mul(new CFrame(0, bottom, 0)).mul(CFrame.Angles(0, twist + (index * math.pi) / 4, 0));
		const thick = tierHeight * 0.9;
		parts.push(
			spec(
				`Needles${index + 1}`,
				new Vector3(across, thick, across),
				frame.mul(new CFrame(0, thick / 2, 0)),
				needles,
				Enum.Material.Grass,
				{ collide: false, tall: true },
			),
			spec(
				`Snow${index + 1}`,
				new Vector3(across * 0.82, 0.7 * unit, across * 0.82),
				frame.mul(new CFrame(0, thick + 0.3 * unit, 0)),
				SNOW,
				Enum.Material.Snow,
				{ collide: false, tall: true, castShadow: false },
			),
		);
	}
	return { kind: "pine", parts };
}

/**
 * A cluster of glowing ice crystals: a tall central shard holding a cool
 * blue light, ringed by three shorter ones leaning outward. Twelve parts.
 */
export function crystalCluster(rng: Random, ground: CFrame, unit: number): FrostProp {
	const color = pick(rng, CRYSTAL);
	const width = rng.NextNumber(1.8, 2.6) * unit;
	const parts = shard(
		"Crystal",
		ground.mul(new CFrame(0, -0.3, 0)).mul(CFrame.Angles(0, rng.NextNumber(0, math.pi / 2), 0)),
		width,
		rng.NextNumber(9, 13) * unit,
		color,
		Enum.Material.Glass,
		0.3,
		{ effect: "crystalGlow" },
	);
	const turn = rng.NextNumber(0, 2 * math.pi);
	for (let index = 0; index < 3; index++) {
		const axis = leaning(
			ground,
			turn + (index * 2 * math.pi) / 3 + rng.NextNumber(-0.3, 0.3),
			rng.NextNumber(0.35, 0.65),
			width * 0.7,
			0.3,
		);
		const across = width * rng.NextNumber(0.55, 0.75);
		const length = rng.NextNumber(4, 7) * unit;
		for (const piece of shard("Crystal", axis, across, length, pick(rng, CRYSTAL), Enum.Material.Glass, 0.3)) {
			parts.push(piece);
		}
	}
	return { kind: "crystals", parts };
}

/** A frozen boulder, slightly tipped, with snow lying on top. Two parts. */
export function frozenBoulder(rng: Random, ground: CFrame, unit: number): FrostProp {
	const size = new Vector3(rng.NextNumber(5, 8), rng.NextNumber(3.5, 5.5), rng.NextNumber(4.5, 7)).mul(unit);
	const body = ground
		.mul(new CFrame(0, size.Y / 2 - 0.4 * unit, 0))
		.mul(CFrame.Angles(rng.NextNumber(-0.1, 0.1), 0, rng.NextNumber(-0.1, 0.1)));
	return {
		kind: "boulder",
		parts: [
			spec("Boulder", size, body, pick(rng, ROCK), Enum.Material.Slate),
			spec(
				"BoulderSnow",
				new Vector3(size.X * 0.85, 0.8 * unit, size.Z * 0.8),
				body.mul(new CFrame(0, size.Y / 2, 0)),
				SNOW,
				Enum.Material.Snow,
			),
		],
	};
}

/** A frozen pond: a flat disc of ice in a ring of packed snow, walked over, not on. Two parts. */
export function frozenPond(rng: Random, ground: CFrame, unit: number): FrostProp {
	const diameter = rng.NextNumber(11, 15) * unit;
	const foot = new CFrame(ground.Position);
	const [rimSize, rimFrame] = disc(foot, 0.3, diameter + 2 * unit);
	const [iceSize, iceFrame] = disc(foot, 0.4, diameter);
	const options = { shape: Enum.PartType.Cylinder, collide: false, castShadow: false };
	return {
		kind: "pond",
		parts: [
			spec("PondRim", rimSize, rimFrame, SNOW_SHADE, Enum.Material.Snow, options),
			spec("Pond", iceSize, iceFrame, POND, Enum.Material.Ice, { ...options, transparency: 0.1 }),
		],
	};
}

/** A low, smooth snowdrift: one long ridge. Two parts. */
export function snowDrift(rng: Random, ground: CFrame, unit: number): FrostProp {
	return {
		kind: "drift",
		parts: ridge(
			"Drift",
			ground.mul(new CFrame(0, -0.2, 0)),
			rng.NextNumber(5, 9) * unit,
			rng.NextNumber(1.2, 2.2) * unit,
			rng.NextNumber(3, 5) * unit,
			SNOW,
			Enum.Material.Snow,
			{ collide: false, castShadow: false },
		),
	};
}

/**
 * A row of icicles hanging from a terrace's top edge down its cliff face.
 * `edge` sits on the edge at floor height, its look vector pointing out of
 * the cliff; the row runs along its right vector. One Wedge per icicle,
 * hung upside down with its flat back on the cliff.
 */
export function icicleRow(rng: Random, edge: CFrame, unit: number, count: number): FrostProp {
	const parts: PartSpec[] = [];
	const spacing = 1.6 * unit;
	for (let index = 0; index < count; index++) {
		const length = rng.NextNumber(2.5, 7) * unit;
		const width = rng.NextNumber(0.6, 1.1) * unit;
		const depth = rng.NextNumber(0.7, 1.3) * unit;
		const along = (index - (count - 1) / 2) * spacing + rng.NextNumber(-0.3, 0.3) * unit;
		// Looking out of the cliff, local +Z points into it; turning about Z hangs the point down against the face.
		const frame = edge.mul(new CFrame(along, -length / 2, -depth / 2)).mul(CFrame.Angles(0, 0, math.pi));
		parts.push(
			spec("Icicle", new Vector3(width, length, depth), frame, pick(rng, ICE), Enum.Material.Ice, {
				shape: Enum.PartType.Wedge,
				collide: false,
				transparency: 0.2,
				castShadow: false,
			}),
		);
	}
	return { kind: "icicles", parts };
}

/** An invisible sheet high over a terrace that snow drifts down from. One part. */
export function snowfall(frame: CFrame, size: Vector3): FrostProp {
	return {
		kind: "snowfall",
		parts: [
			spec("Snowfall", size, frame, SNOW, Enum.Material.SmoothPlastic, {
				collide: false,
				transparency: 1,
				castShadow: false,
				effect: "snowfall",
			}),
		],
	};
}
