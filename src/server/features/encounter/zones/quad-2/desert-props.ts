import type { PartSpec } from "./part-spec";

/**
 * The desert's props as pure part lists. Each builder takes the prop's
 * origin (a point on the floor, already turned to face its way), a size
 * factor `k` (1 on a terrace about 90 studs wide) and the zone's Random, and
 * returns its parts and the radius it claims on the floor.
 */
export interface Prop {
	parts: PartSpec[];
	radius: number;
}

export type PropBuilder = (origin: CFrame, k: number, rng: Random) => Prop;

const QUARTER = math.pi / 2;

export const SAND = Color3.fromRGB(232, 196, 138);
export const SAND_DARK = Color3.fromRGB(214, 170, 108);
const SANDSTONE = Color3.fromRGB(206, 144, 88);
const SANDSTONE_LIGHT = Color3.fromRGB(226, 174, 112);
const SANDSTONE_DARK = Color3.fromRGB(172, 112, 68);
const CACTUS = Color3.fromRGB(94, 140, 72);
const CACTUS_DARK = Color3.fromRGB(72, 114, 58);
const PALM_TRUNK = Color3.fromRGB(146, 104, 62);
const FROND = Color3.fromRGB(104, 152, 62);
const FROND_DARK = Color3.fromRGB(78, 124, 50);
const COCONUT = Color3.fromRGB(104, 72, 40);
const WATER = Color3.fromRGB(64, 168, 196);
const REED = Color3.fromRGB(120, 150, 70);
const CLAY = Color3.fromRGB(186, 98, 58);
const CLAY_DARK = Color3.fromRGB(150, 74, 44);
const WOOD = Color3.fromRGB(122, 86, 52);
const BONE = Color3.fromRGB(238, 228, 204);
const BRONZE = Color3.fromRGB(120, 84, 48);
const CLOTHS = [Color3.fromRGB(196, 72, 48), Color3.fromRGB(226, 168, 62), Color3.fromRGB(176, 120, 72)];

function at(origin: CFrame, x: number, y: number, z: number): CFrame {
	return origin.mul(new CFrame(x, y, z));
}

/** `color`, a little lighter or darker, so repeated parts don't read as copies. */
function vary(color: Color3, rng: Random, amount = 0.08): Color3 {
	const t = rng.NextNumber(-amount, amount);
	return t >= 0 ? color.Lerp(new Color3(1, 1, 1), t) : color.Lerp(new Color3(0, 0, 0), -t);
}

function block(
	name: string,
	size: Vector3,
	cframe: CFrame,
	color: Color3,
	material: Enum.Material,
	collides = true,
): PartSpec {
	return { name, size, cframe, color, material, collides };
}

/** A cylinder whose axis runs along `cframe`'s X. */
function cylinder(
	name: string,
	length: number,
	diameter: number,
	cframe: CFrame,
	color: Color3,
	material: Enum.Material,
	collides = true,
): PartSpec {
	return {
		name,
		size: new Vector3(length, diameter, diameter),
		cframe,
		color,
		material,
		shape: Enum.PartType.Cylinder,
		collides,
	};
}

/** A cylinder standing on its end, centred on `cframe`. */
function post(
	name: string,
	length: number,
	diameter: number,
	cframe: CFrame,
	color: Color3,
	material: Enum.Material,
	collides = true,
): PartSpec {
	return cylinder(name, length, diameter, cframe.mul(CFrame.Angles(0, 0, QUARTER)), color, material, collides);
}

function ball(
	name: string,
	diameter: number,
	cframe: CFrame,
	color: Color3,
	material: Enum.Material,
	collides = true,
): PartSpec {
	return {
		name,
		size: new Vector3(diameter, diameter, diameter),
		cframe,
		color,
		material,
		shape: Enum.PartType.Ball,
		collides,
	};
}

/** A weathered sandstone column; some are broken, with a drum fallen beside them. */
export const pillar: PropBuilder = (origin, k, rng) => {
	const width = 3.6 * k;
	const broken = rng.NextNumber() < 0.4;
	const height = rng.NextNumber(14, 22) * k * (broken ? 0.5 : 1);
	const base = 1.2 * k;
	const drum = height / 3;
	const parts = [
		block(
			"PillarPlinth",
			new Vector3(width + 1.4 * k, base, width + 1.4 * k),
			at(origin, 0, base / 2, 0),
			SANDSTONE_DARK,
			Enum.Material.Sandstone,
		),
	];
	for (let i = 0; i < 3; i++) {
		const drift = rng.NextNumber(-0.15, 0.15) * k;
		parts.push(
			post(
				"PillarDrum",
				drum,
				width * (1 - 0.05 * i),
				at(origin, drift, base + drum * (i + 0.5), 0),
				vary(SANDSTONE, rng),
				Enum.Material.Sandstone,
			),
		);
	}
	if (!broken) {
		const cap = new Vector3(width + k, 1.2 * k, width + k);
		parts.push(
			block("PillarCapital", cap, at(origin, 0, base + height + 0.6 * k, 0), SANDSTONE_LIGHT, Enum.Material.Sandstone),
		);
		return { parts, radius: width };
	}
	const fallen = at(origin, width * 1.6, width / 2, 0).mul(CFrame.Angles(0, rng.NextNumber(-0.6, 0.6), 0));
	parts.push(cylinder("FallenDrum", drum, width, fallen, vary(SANDSTONE, rng), Enum.Material.Sandstone));
	return { parts, radius: width * 1.6 + drum / 2 + k };
};

/** A ruined sandstone arch, spanning its origin's Z. */
export const arch: PropBuilder = (origin, k, rng) => {
	const span = 11 * k;
	const thick = 3 * k;
	const height = 15 * k;
	const base = k;
	const parts: PartSpec[] = [];
	for (const side of [-1, 1]) {
		const z = side * (span / 2 + thick / 2);
		const lower = height * 0.55;
		const upper = height - lower;
		parts.push(
			block(
				"ArchPlinth",
				new Vector3(thick + k, base, thick + k),
				at(origin, 0, base / 2, z),
				SANDSTONE_DARK,
				Enum.Material.Sandstone,
			),
			block(
				"ArchPost",
				new Vector3(thick, lower, thick),
				at(origin, 0, base + lower / 2, z),
				vary(SANDSTONE, rng),
				Enum.Material.Sandstone,
			),
			block(
				"ArchPost",
				new Vector3(thick * 0.94, upper, thick * 0.94),
				at(origin, 0, base + lower + upper / 2, z).mul(CFrame.Angles(0, rng.NextNumber(-0.08, 0.08), 0)),
				vary(SANDSTONE, rng),
				Enum.Material.Sandstone,
			),
		);
	}
	// The lintel has lost a chunk off one end.
	const lintelSide = rng.NextNumber() < 0.5 ? -1 : 1;
	const lintelLength = span + thick * 1.5;
	const top = base + height;
	parts.push(
		block(
			"ArchLintel",
			new Vector3(thick, 2.2 * k, lintelLength),
			at(origin, 0, top + 1.1 * k, lintelSide * thick * 0.25),
			SANDSTONE_LIGHT,
			Enum.Material.Sandstone,
		),
		block(
			"ArchKeystone",
			new Vector3(thick * 0.8, 1.6 * k, 2.2 * k),
			at(origin, 0, top + 3 * k, 0),
			SANDSTONE_DARK,
			Enum.Material.Sandstone,
		),
	);
	for (let i = 0; i < 2; i++) {
		const size = rng.NextNumber(1.2, 2) * k;
		parts.push(
			block(
				"ArchRubble",
				new Vector3(size, size * 0.8, size * 1.2),
				at(origin, rng.NextNumber(-3, 3) * k, size * 0.3, rng.NextNumber(-span / 2, span / 2)).mul(
					CFrame.Angles(rng.NextNumber(-0.3, 0.3), rng.NextNumber(0, math.pi), rng.NextNumber(-0.3, 0.3)),
				),
				vary(SANDSTONE, rng),
				Enum.Material.Sandstone,
			),
		);
	}
	return { parts, radius: span / 2 + thick + k };
};

/** A saguaro: a trunk and up to two arms. */
export const cactus: PropBuilder = (origin, k, rng) => {
	const height = rng.NextNumber(8, 14) * k;
	const width = 1.8 * k;
	const color = vary(CACTUS, rng);
	const parts = [
		post("CactusTrunk", height, width, at(origin, 0, height / 2, 0), color, Enum.Material.Plastic),
		ball("CactusTop", width, at(origin, 0, height, 0), color, Enum.Material.Plastic),
	];
	let reach = width / 2;
	for (const side of [-1, 1]) {
		if (rng.NextNumber() < 0.25) continue;
		const armY = height * rng.NextNumber(0.35, 0.6);
		const out = rng.NextNumber(2, 3) * k;
		const rise = rng.NextNumber(2.5, 4.5) * k;
		const arm = width * 0.75;
		reach = math.max(reach, out + arm / 2);
		parts.push(
			cylinder("CactusElbow", out, arm, at(origin, (side * out) / 2, armY, 0), CACTUS_DARK, Enum.Material.Plastic),
			post("CactusArm", rise, arm, at(origin, side * out, armY + rise / 2, 0), color, Enum.Material.Plastic),
			ball("CactusArmTop", arm, at(origin, side * out, armY + rise, 0), color, Enum.Material.Plastic),
		);
	}
	return { parts, radius: reach + k };
};

/**
 * A palm whose trunk curves toward its origin's look direction, under a
 * drooping crown of fronds.
 */
export const palm: PropBuilder = (origin, k, rng) => {
	const height = rng.NextNumber(16, 22) * k;
	const segments = 5;
	const length = height / segments;
	const lean = rng.NextNumber(0.25, 0.5);
	const parts: PartSpec[] = [];
	let point = new Vector3(0, 0, 0);
	for (let i = 0; i < segments; i++) {
		const tilt = (lean * (i + 1)) / segments;
		const direction = new Vector3(0, math.cos(tilt), -math.sin(tilt));
		const centre = point.add(direction.mul(length / 2));
		const cframe = origin.mul(new CFrame(centre)).mul(CFrame.Angles(-tilt, 0, 0));
		parts.push(
			post("PalmTrunk", length + 0.4 * k, (1.7 - 0.12 * i) * k, cframe, vary(PALM_TRUNK, rng), Enum.Material.Wood),
		);
		point = point.add(direction.mul(length));
	}
	const crown = origin.mul(new CFrame(point));
	const frondLength = 7.5 * k;
	const fronds = 6;
	const turn = rng.NextNumber(0, math.pi);
	for (let i = 0; i < fronds; i++) {
		const cframe = crown
			.mul(CFrame.Angles(0, turn + (i * 2 * math.pi) / fronds, 0))
			.mul(CFrame.Angles(0, 0, -rng.NextNumber(0.3, 0.55)))
			.mul(new CFrame(frondLength / 2, 0, 0));
		parts.push(
			block(
				"PalmFrond",
				new Vector3(frondLength, 0.3 * k, 1.9 * k),
				cframe,
				i % 2 === 0 ? FROND : FROND_DARK,
				Enum.Material.Grass,
				false,
			),
		);
	}
	for (let i = 0; i < 3; i++) {
		const angle = (i * 2 * math.pi) / 3;
		const offset = new Vector3(math.cos(angle) * 0.8 * k, -0.9 * k, math.sin(angle) * 0.8 * k);
		parts.push(ball("Coconut", 1.1 * k, crown.mul(new CFrame(offset)), COCONUT, Enum.Material.Wood, false));
	}
	return { parts, radius: 2.5 * k };
};

/** Two or three clay pots, one sometimes tipped over. */
export const pots: PropBuilder = (origin, k, rng) => {
	const count = rng.NextInteger(2, 3);
	const parts: PartSpec[] = [];
	for (let i = 0; i < count; i++) {
		const size = 2.6 * k * rng.NextNumber(0.8, 1.2);
		const angle = (i * 2 * math.pi) / count + rng.NextNumber(-0.3, 0.3);
		const spot = new Vector3(math.cos(angle) * 1.7 * k, 0, math.sin(angle) * 1.7 * k);
		const tipped = i === count - 1 && rng.NextNumber() < 0.5;
		// A tipped pot lies on its side: its body's centre stays at its radius.
		const stand = origin.mul(new CFrame(spot.add(new Vector3(0, size * 0.45, 0))));
		const body = tipped ? stand.mul(CFrame.Angles(0, rng.NextNumber(0, math.pi), QUARTER)) : stand;
		const color = vary(i % 2 === 0 ? CLAY : CLAY_DARK, rng);
		parts.push(
			ball("PotBody", size, body, color, Enum.Material.Slate),
			post("PotNeck", 0.8 * k, size * 0.45, body.mul(new CFrame(0, size * 0.5, 0)), color, Enum.Material.Slate),
			post(
				"PotRim",
				0.3 * k,
				size * 0.6,
				body.mul(new CFrame(0, size * 0.5 + 0.5 * k, 0)),
				CLAY_DARK,
				Enum.Material.Slate,
			),
		);
	}
	return { parts, radius: 3.6 * k };
};

/** A tattered cloth awning on four poles over a rug and a crate. */
export const awning: PropBuilder = (origin, k, rng) => {
	const halfWidth = 5 * k;
	const halfDepth = 4 * k;
	const front = 8 * k;
	const back = 6.5 * k;
	const parts: PartSpec[] = [];
	for (const x of [-halfWidth, halfWidth]) {
		parts.push(
			post("AwningPole", front, 0.5 * k, at(origin, x, front / 2, halfDepth), WOOD, Enum.Material.Wood),
			post("AwningPole", back, 0.5 * k, at(origin, x, back / 2, -halfDepth), WOOD, Enum.Material.Wood),
		);
	}
	const cloth = CLOTHS[rng.NextInteger(0, CLOTHS.size() - 1)];
	const slope = math.atan((front - back) / (2 * halfDepth));
	const canopyDepth = (2 * halfDepth) / math.cos(slope) + k;
	parts.push(
		block(
			"AwningCloth",
			new Vector3(2 * halfWidth + k, 0.2 * k, canopyDepth),
			at(origin, 0, (front + back) / 2 + 0.2 * k, 0).mul(CFrame.Angles(slope, 0, 0)),
			cloth,
			Enum.Material.Fabric,
			false,
		),
	);
	for (let i = 0; i < 3; i++) {
		const strip = rng.NextNumber(1.5, 2.8) * k;
		parts.push(
			block(
				"AwningTatter",
				new Vector3(1.4 * k, strip, 0.1 * k),
				at(origin, -halfWidth + (i + 0.6) * 3 * k, front - strip / 2, halfDepth + 0.6 * k),
				vary(CLOTHS[(i + 1) % CLOTHS.size()], rng),
				Enum.Material.Fabric,
				false,
			),
		);
	}
	parts.push(
		block(
			"AwningRug",
			new Vector3(6 * k, 0.1 * k, 4.5 * k),
			at(origin, 0, 0.05 * k, 0),
			CLOTHS[0],
			Enum.Material.Fabric,
			false,
		),
		block(
			"AwningCrate",
			new Vector3(2.4 * k, 2.4 * k, 2.4 * k),
			at(origin, halfWidth * 0.5, 1.2 * k, -halfDepth * 0.4).mul(CFrame.Angles(0, rng.NextNumber(-0.4, 0.4), 0)),
			WOOD,
			Enum.Material.WoodPlanks,
		),
	);
	return { parts, radius: math.sqrt(halfWidth * halfWidth + halfDepth * halfDepth) + k };
};

/** A bleached ribcage and horned skull, half sunk in the sand. Decoration only: nothing collides. */
export const bones: PropBuilder = (origin, k, rng) => {
	const spine = 8 * k;
	const parts: PartSpec[] = [
		block(
			"BoneSpine",
			new Vector3(0.6 * k, 0.6 * k, spine),
			at(origin, 0, 0.2 * k, 0),
			BONE,
			Enum.Material.Limestone,
			false,
		),
	];
	for (let i = 0; i < 4; i++) {
		const z = -spine / 2 + spine * (0.25 + i * 0.15);
		const rib = (3.2 - 0.3 * i) * k;
		for (const side of [-1, 1]) {
			parts.push(
				block(
					"BoneRib",
					new Vector3(0.35 * k, rib, 0.35 * k),
					at(origin, side * 0.9 * k, rib * 0.35, z).mul(CFrame.Angles(0, 0, -side * rng.NextNumber(0.4, 0.6))),
					BONE,
					Enum.Material.Limestone,
					false,
				),
			);
		}
	}
	const skull = at(origin, 0, 0.6 * k, spine / 2 + 0.8 * k).mul(CFrame.Angles(0, rng.NextNumber(-0.4, 0.4), 0.2));
	parts.push(block("BoneSkull", new Vector3(1.6 * k, 1.3 * k, 2.2 * k), skull, BONE, Enum.Material.Limestone, false));
	for (const side of [-1, 1]) {
		parts.push(
			block(
				"BoneHorn",
				new Vector3(0.3 * k, 2 * k, 0.3 * k),
				skull.mul(new CFrame(side * 0.9 * k, 0.9 * k, -0.3 * k)).mul(CFrame.Angles(-0.3, 0, -side * 0.6)),
				BONE,
				Enum.Material.Limestone,
				false,
			),
		);
	}
	return { parts, radius: spine / 2 + 2 * k };
};

/** One or two sandstone boulders, sunk into the floor at a tilt. */
export const rocks: PropBuilder = (origin, k, rng) => {
	const parts: PartSpec[] = [];
	const count = rng.NextInteger(1, 2);
	let reach = 0;
	for (let i = 0; i < count; i++) {
		const size = new Vector3(rng.NextNumber(3, 6), rng.NextNumber(2, 4), rng.NextNumber(3, 6)).mul(k);
		const offset = i === 0 ? 0 : 3 * k;
		reach = math.max(reach, offset + size.Magnitude / 2);
		parts.push(
			block(
				"Boulder",
				size,
				at(origin, offset, size.Y * 0.3, 0).mul(
					CFrame.Angles(rng.NextNumber(-0.25, 0.25), rng.NextNumber(0, math.pi), rng.NextNumber(-0.25, 0.25)),
				),
				vary(i === 0 ? SANDSTONE : SANDSTONE_DARK, rng),
				Enum.Material.Sandstone,
			),
		);
	}
	return { parts, radius: reach };
};

/** A low dune: a capsule of sand, mostly sunk, so only a soft mound shows. */
export const dune: PropBuilder = (origin, k, rng) => {
	const diameter = 7 * k;
	const length = rng.NextNumber(8, 14) * k;
	const rise = rng.NextNumber(1.4, 2) * k;
	const y = rise - diameter / 2;
	const color = vary(SAND_DARK, rng, 0.04);
	return {
		parts: [
			cylinder("Dune", length, diameter, at(origin, 0, y, 0), color, Enum.Material.Sand),
			ball("DuneEnd", diameter, at(origin, -length / 2, y, 0), color, Enum.Material.Sand),
			ball("DuneEnd", diameter, at(origin, length / 2, y, 0), color, Enum.Material.Sand),
		],
		// Claims only the mound that shows, not the sunk ends.
		radius: length / 2 + diameter * 0.4,
	};
};

/** A sandstone obelisk with a lit bronze brazier on top: a pair marks each terrace's front edge. */
export const obelisk: PropBuilder = (origin, k) => {
	const width = 2.4 * k;
	const height = 10 * k;
	const base = k;
	const top = base + height;
	return {
		parts: [
			block(
				"ObeliskPlinth",
				new Vector3(width + k, base, width + k),
				at(origin, 0, base / 2, 0),
				SANDSTONE_DARK,
				Enum.Material.Sandstone,
			),
			block(
				"ObeliskShaft",
				new Vector3(width, height, width),
				at(origin, 0, base + height / 2, 0),
				SANDSTONE,
				Enum.Material.Sandstone,
			),
			post("BrazierStem", 0.8 * k, 0.8 * k, at(origin, 0, top + 0.4 * k, 0), BRONZE, Enum.Material.CorrodedMetal),
			{
				...post("BrazierBowl", 0.8 * k, 2.2 * k, at(origin, 0, top + 1.2 * k, 0), BRONZE, Enum.Material.CorrodedMetal),
				effect: "flame",
			},
		],
		radius: width,
	};
};

/**
 * A small oasis: an oval pool ringed with damp sand, reeds and stones, and
 * three palms leaning in over it. The long axis runs along the origin's Z.
 */
export const oasis: PropBuilder = (origin, k, rng) => {
	const pool = 4.5 * k;
	const stretch = 3.5 * k;
	const parts: PartSpec[] = [];
	[-stretch, stretch].forEach((z, index) => {
		// The second disc sits a hair higher so the overlap doesn't flicker.
		const lift = index * 0.02;
		parts.push(
			post("OasisShore", 0.2, 2 * (pool + 1.6 * k), at(origin, 0, 0.1 + lift, z), SAND_DARK, Enum.Material.Sand, false),
			// Opaque: two overlapping see-through discs would show a darker seam.
			post("OasisWater", 0.3, 2 * pool, at(origin, 0, 0.25 + lift, z), WATER, Enum.Material.Glass, false),
		);
	});
	for (let i = 0; i < 6; i++) {
		const angle = (i * 2 * math.pi) / 6 + rng.NextNumber(-0.2, 0.2);
		const size = rng.NextNumber(1.2, 2) * k;
		const x = math.cos(angle) * (pool + 0.9 * k);
		const z = math.sin(angle) * (pool + stretch + 0.9 * k);
		parts.push(
			block(
				"OasisStone",
				new Vector3(size, size * 0.6, size),
				at(origin, x, size * 0.2, z).mul(CFrame.Angles(0, rng.NextNumber(0, math.pi), 0)),
				vary(SANDSTONE, rng),
				Enum.Material.Sandstone,
			),
		);
		const reed = rng.NextNumber(2.5, 3.5) * k;
		const reedAngle = angle + math.pi / 6;
		parts.push(
			block(
				"OasisReed",
				new Vector3(0.3 * k, reed, 0.3 * k),
				at(origin, math.cos(reedAngle) * pool * 0.95, reed / 2, math.sin(reedAngle) * (pool + stretch) * 0.95).mul(
					CFrame.Angles(rng.NextNumber(-0.2, 0.2), 0, rng.NextNumber(-0.2, 0.2)),
				),
				REED,
				Enum.Material.Grass,
				false,
			),
		);
	}
	const spots = [new Vector3(-6.5 * k, 0, -5 * k), new Vector3(6.5 * k, 0, 1.5 * k), new Vector3(-5.5 * k, 0, 7.5 * k)];
	for (const spot of spots) {
		const toward = origin.mul(CFrame.lookAt(spot, new Vector3(0, 0, 0)));
		for (const part of palm(toward, k * 0.9, rng).parts) parts.push(part);
	}
	return { parts, radius: pool + stretch + 4 * k };
};
