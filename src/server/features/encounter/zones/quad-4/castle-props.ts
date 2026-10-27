import type { Piece } from "./castle-geometry";

/**
 * The castle's props as pieces. Each takes an origin on the floor and `u`,
 * the zone's scale (1 on a quad 4 terrace); a free-standing prop's local +X
 * faces the lane, so the planner only has to turn it.
 */

export const STONE = Color3.fromRGB(150, 146, 136);
export const DARK_STONE = Color3.fromRGB(98, 98, 106);
const ROYAL_BLUE = Color3.fromRGB(28, 52, 140);
const GOLD = Color3.fromRGB(226, 178, 52);
const WOOD = Color3.fromRGB(112, 76, 46);
const DARK_WOOD = Color3.fromRGB(78, 52, 32);
const IRON = Color3.fromRGB(72, 72, 78);
const STEEL = Color3.fromRGB(180, 184, 192);
const HAY = Color3.fromRGB(214, 184, 96);
const EMBER = Color3.fromRGB(255, 120, 40);

/** A Cylinder Part's axis is its local X; this stands it up. */
const UPRIGHT = CFrame.Angles(0, 0, math.pi / 2);

interface PieceStyle {
	color: Color3;
	material: Enum.Material;
	collidable: boolean;
	shape?: Piece["shape"];
	transparency?: number;
	fire?: boolean;
}

const stone = (color = STONE): PieceStyle => ({ color, material: Enum.Material.Cobblestone, collidable: true });
const cloth = (color: Color3): PieceStyle => ({ color, material: Enum.Material.Fabric, collidable: false });

function piece(origin: CFrame, name: string, size: Vector3, offset: CFrame, style: PieceStyle): Piece {
	return { name, size, cframe: origin.mul(offset), ...style };
}

function cylinder(origin: CFrame, name: string, height: number, diameter: number, at: Vector3, style: PieceStyle) {
	return piece(origin, name, new Vector3(height, diameter, diameter), new CFrame(at).mul(UPRIGHT), {
		...style,
		shape: "Cylinder",
	});
}

/** A crenellated curtain wall from `from` to `to`, both on the floor and in a line along X or Z. */
export function wallRun(from: Vector3, to: Vector3, u: number): Piece[] {
	const thickness = 3 * u;
	const height = 9 * u;
	const length = to.sub(from).Magnitude;
	const origin = CFrame.lookAt(from.Lerp(to, 0.5), to);
	const pieces = [piece(origin, "Wall", new Vector3(thickness, height, length), new CFrame(0, height / 2, 0), stone())];
	// Merlons as wide as the gaps between them, the classic battlement rhythm.
	const merlon = 2.4 * u;
	const count = math.max(1, math.floor(length / (7 * u)));
	const spacing = length / count;
	for (let i = 0; i < count; i++) {
		const z = -length / 2 + spacing * (i + 0.5);
		pieces.push(
			piece(
				origin,
				"Merlon",
				new Vector3(thickness, merlon, spacing / 2),
				new CFrame(0, height + merlon / 2, z),
				stone(),
			),
		);
	}
	return pieces;
}

/** A round watchtower `radius` wide at its crown, flying a pennant. */
export function watchtower(base: Vector3, radius: number, u: number): Piece[] {
	const origin = new CFrame(base);
	const height = 17 * u;
	const crown = 2.5 * u;
	const merlon = 2 * u;
	const top = height + crown;
	const reach = radius - merlon / 2;
	const pieces = [
		cylinder(origin, "TowerBody", height, 2 * (radius - 0.8 * u), new Vector3(0, height / 2, 0), stone()),
		cylinder(origin, "TowerCrown", crown, 2 * radius, new Vector3(0, height + crown / 2, 0), stone(DARK_STONE)),
	];
	for (const [x, z] of [
		[reach, 0],
		[-reach, 0],
		[0, reach],
		[0, -reach],
	]) {
		pieces.push(
			piece(
				origin,
				"Merlon",
				new Vector3(merlon, merlon, merlon),
				new CFrame(x, top + merlon / 2, z),
				stone(DARK_STONE),
			),
		);
	}
	const pole = 7 * u;
	pieces.push(
		cylinder(origin, "Flagpole", pole, 0.4 * u, new Vector3(0, top + pole / 2, 0), {
			color: DARK_WOOD,
			material: Enum.Material.Wood,
			collidable: false,
		}),
		piece(
			origin,
			"Pennant",
			new Vector3(3.2 * u, 1.8 * u, 0.15),
			new CFrame(1.7 * u, top + pole - 1.1 * u, 0),
			cloth(ROYAL_BLUE),
		),
	);
	return pieces;
}

/**
 * A stone gateway over the lane, `innerHalf` from its middle to each pillar,
 * its lintel's underside at `clearance`. Banners hang on the pillars' faces
 * toward the spawn, and corner blocks turned 45 degrees round the opening.
 */
export function gateway(floor: Vector3, innerHalf: number, clearance: number, u: number): Piece[] {
	const origin = new CFrame(floor);
	const pillar = 4 * u;
	const depth = 3 * u;
	const lintel = 4 * u;
	const outer = innerHalf + pillar;
	const pieces: Piece[] = [];
	for (const side of [-1, 1]) {
		const x = side * (innerHalf + pillar / 2);
		pieces.push(
			piece(origin, "GatePillar", new Vector3(pillar, clearance, depth), new CFrame(x, clearance / 2, 0), stone()),
			piece(
				origin,
				"GateCorner",
				new Vector3(2.4 * u, 2.4 * u, depth),
				new CFrame(side * innerHalf, clearance, 0).mul(CFrame.Angles(0, 0, math.pi / 4)),
				stone(),
			),
			piece(
				origin,
				"GateBanner",
				new Vector3(pillar * 0.75, clearance * 0.55, 0.2),
				new CFrame(x, clearance * 0.62, depth / 2 + 0.1),
				cloth(ROYAL_BLUE),
			),
			piece(
				origin,
				"GateBannerTrim",
				new Vector3(pillar * 0.75, 0.8 * u, 0.25),
				new CFrame(x, clearance * 0.62 - clearance * 0.275 + 0.4 * u, depth / 2 + 0.1),
				cloth(GOLD),
			),
		);
	}
	pieces.push(
		piece(
			origin,
			"GateLintel",
			new Vector3(2 * outer, lintel, depth),
			new CFrame(0, clearance + lintel / 2, 0),
			stone(DARK_STONE),
		),
	);
	for (const x of [-outer + 1.5 * u, 0, outer - 1.5 * u]) {
		pieces.push(
			piece(
				origin,
				"Merlon",
				new Vector3(3 * u, 2.4 * u, depth),
				new CFrame(x, clearance + lintel + 1.2 * u, 0),
				stone(DARK_STONE),
			),
		);
	}
	const crest = new CFrame(0, clearance + lintel / 2, depth / 2 + 0.15).mul(CFrame.Angles(0, math.pi / 2, 0));
	pieces.push(
		piece(origin, "Crest", new Vector3(0.3, 3.4 * u, 3.4 * u), crest, {
			color: GOLD,
			material: Enum.Material.Metal,
			collidable: false,
			shape: "Cylinder",
		}),
	);
	return pieces;
}

/** A heraldic banner, blue with a gold hem and lozenge, hung beside its pole from an arm, facing the lane. */
export function bannerPole(origin: CFrame, u: number): Piece[] {
	const height = 15 * u;
	const width = 3.6 * u;
	const drop = 8 * u;
	const hang = height - 1 * u;
	const clothZ = 0.4 * u + width / 2;
	return [
		cylinder(origin, "BannerPole", height, 0.5 * u, new Vector3(0, height / 2, 0), {
			color: DARK_WOOD,
			material: Enum.Material.Wood,
			collidable: true,
		}),
		piece(origin, "BannerArm", new Vector3(0.3 * u, 0.3 * u, width + 0.8 * u), new CFrame(0, hang, clothZ - 0.2 * u), {
			color: DARK_WOOD,
			material: Enum.Material.Wood,
			collidable: false,
		}),
		piece(origin, "Banner", new Vector3(0.15, drop, width), new CFrame(0, hang - drop / 2, clothZ), cloth(ROYAL_BLUE)),
		piece(
			origin,
			"BannerHem",
			new Vector3(0.2, 0.8 * u, width),
			new CFrame(0, hang - drop + 0.4 * u, clothZ),
			cloth(GOLD),
		),
		piece(
			origin,
			"BannerLozenge",
			new Vector3(0.2, 1.8 * u, 1.8 * u),
			new CFrame(0, hang - drop / 2 + 0.6 * u, clothZ).mul(CFrame.Angles(math.pi / 4, 0, 0)),
			cloth(GOLD),
		),
		piece(origin, "BannerFinial", new Vector3(0.9 * u, 0.9 * u, 0.9 * u), new CFrame(0, height + 0.3 * u, 0), {
			color: GOLD,
			material: Enum.Material.Metal,
			collidable: false,
			shape: "Ball",
		}),
	];
}

/** An iron fire bowl on a stone stand; the bowl carries the fire and the light. */
export function brazier(origin: CFrame, u: number): Piece[] {
	const stand = 3 * u;
	const bowl = 1.2 * u;
	return [
		cylinder(origin, "BrazierStand", stand, 1.4 * u, new Vector3(0, stand / 2, 0), stone(DARK_STONE)),
		cylinder(origin, "BrazierBowl", bowl, 3 * u, new Vector3(0, stand + bowl / 2, 0), {
			color: IRON,
			material: Enum.Material.Metal,
			collidable: true,
			fire: true,
		}),
		cylinder(origin, "BrazierCoals", 0.3 * u, 2.4 * u, new Vector3(0, stand + bowl, 0), {
			color: EMBER,
			material: Enum.Material.Neon,
			collidable: false,
		}),
	];
}

/** A wooden rack holding two spears and a sword against its rail. */
export function weaponRack(origin: CFrame, u: number): Piece[] {
	const wood = { color: WOOD, material: Enum.Material.Wood, collidable: true };
	const pieces = [
		piece(origin, "RackPost", new Vector3(0.6 * u, 5 * u, 0.6 * u), new CFrame(0, 2.5 * u, -2 * u), wood),
		piece(origin, "RackPost", new Vector3(0.6 * u, 5 * u, 0.6 * u), new CFrame(0, 2.5 * u, 2 * u), wood),
		piece(origin, "RackRail", new Vector3(0.5 * u, 0.5 * u, 4.6 * u), new CFrame(0, 4.2 * u, 0), wood),
	];
	const lean = CFrame.Angles(0, 0, math.rad(12));
	for (const z of [-1.3 * u, 1.3 * u]) {
		const base = new CFrame(1 * u, 0, z).mul(lean);
		pieces.push(
			piece(origin, "Spear", new Vector3(0.25 * u, 6 * u, 0.25 * u), base.mul(new CFrame(0, 3 * u, 0)), {
				color: DARK_WOOD,
				material: Enum.Material.Wood,
				collidable: false,
			}),
			piece(origin, "SpearHead", new Vector3(0.2 * u, 1 * u, 0.5 * u), base.mul(new CFrame(0, 6.5 * u, 0)), {
				color: STEEL,
				material: Enum.Material.Metal,
				collidable: false,
			}),
		);
	}
	const sword = new CFrame(1 * u, 0, 0).mul(lean);
	pieces.push(
		piece(origin, "SwordBlade", new Vector3(0.15 * u, 4.2 * u, 0.5 * u), sword.mul(new CFrame(0, 2.6 * u, 0)), {
			color: STEEL,
			material: Enum.Material.Metal,
			collidable: false,
		}),
	);
	return pieces;
}

/** Two or three iron-hooped barrels. */
export function barrels(origin: CFrame, u: number, count: number): Piece[] {
	const height = 3.2 * u;
	const diameter = 2.6 * u;
	const spots = [new Vector3(0, 0, -1.5 * u), new Vector3(0, 0, 1.5 * u), new Vector3(-2.2 * u, 0, 0)];
	const pieces: Piece[] = [];
	for (let i = 0; i < math.min(count, spots.size()); i++) {
		const spot = spots[i];
		pieces.push(
			cylinder(origin, "Barrel", height, diameter, spot.add(new Vector3(0, height / 2, 0)), {
				color: WOOD,
				material: Enum.Material.Wood,
				collidable: true,
			}),
			cylinder(origin, "BarrelHoop", 0.3 * u, diameter + 0.15 * u, spot.add(new Vector3(0, height * 0.7, 0)), {
				color: IRON,
				material: Enum.Material.Metal,
				collidable: false,
			}),
		);
	}
	return pieces;
}

/** Hay bales, two side by side and, with `stacked`, one on top. */
export function hayBales(origin: CFrame, u: number, stacked: boolean): Piece[] {
	const size = new Vector3(2.4 * u, 1.8 * u, 3.6 * u);
	const hay = { color: HAY, material: Enum.Material.Fabric, collidable: true };
	const pieces = [
		piece(origin, "HayBale", size, new CFrame(0, size.Y / 2, -1.9 * u), hay),
		piece(origin, "HayBale", size, new CFrame(0, size.Y / 2, 1.9 * u), hay),
	];
	if (stacked) {
		pieces.push(
			piece(origin, "HayBale", size, new CFrame(0, size.Y * 1.5, 0).mul(CFrame.Angles(0, math.rad(8), 0)), hay),
		);
	}
	return pieces;
}
