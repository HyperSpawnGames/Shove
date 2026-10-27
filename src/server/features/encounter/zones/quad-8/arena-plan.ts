import type { TerraceLayout } from "../../world-layout";
import { Box, boxOf, planGap } from "./geometry";

/**
 * The Neon Arena's dressing as numbers: every part the zone builds, where,
 * and how it looks. Pure, so specs can check the placement guarantees
 * without building anything.
 */

/** Plan-view studs every collidable prop keeps from every keep-clear box. */
export const CLEAR_GAP = 2;
/** At most this many parts in the zone. */
export const PART_BUDGET = 600;
/** Fixed seed: the crowd sits in the same seats every server. */
export const ARENA_SEED = 8008;

/** Studs kept free behind a terrace's front edge (the gate wall) and before its back edge (the ramp up). */
const FRONT_MARGIN = 6;
const BACK_MARGIN = 4;
/** The giant's keep-clear box rises 6 studs per unit of scale, plus 10 (staircase.ts). */
const CLEAR_HEIGHT_PER_SCALE = 6;
const CLEAR_HEIGHT_BASE = 10;
/** Half the ramp's width plus room: the lane lines' offset from the middle. */
const LANE_LINE_X = 10.5;
const RING_SEGMENTS = 12;
const BLEACHER_ROWS = 4;
const CROWD_PER_SIDE = 10;
/** How far apart rope posts stand, at most. */
const POST_SPACING = 28;
const MAX_POSTS = 5;
/** Band widths each kind of side prop needs, from the band's inner edge. */
const ROPE_OFFSET = 2;
const TOWER_OFFSET = 7;
const BLEACHER_OFFSET = 11;
const MIN_BLEACHER_DEPTH = 8;

export const NEON = {
	cyan: Color3.fromRGB(0, 240, 255),
	magenta: Color3.fromRGB(255, 40, 200),
	gold: Color3.fromRGB(255, 200, 50),
	white: Color3.fromRGB(255, 244, 220),
};

export const ARENA = {
	terrace: Color3.fromRGB(16, 20, 40),
	charcoal: Color3.fromRGB(34, 36, 44),
	steel: Color3.fromRGB(70, 74, 88),
	seat: Color3.fromRGB(24, 30, 62),
	board: Color3.fromRGB(12, 12, 22),
	redCorner: Color3.fromRGB(220, 30, 50),
	blueCorner: Color3.fromRGB(30, 90, 230),
	ropeWhite: Color3.fromRGB(235, 235, 240),
};

const CROWD_COLORS = [
	NEON.cyan,
	NEON.magenta,
	NEON.gold,
	ARENA.redCorner,
	ARENA.blueCorner,
	Color3.fromRGB(240, 240, 240),
	Color3.fromRGB(120, 255, 120),
];

/** Something a prop carries beyond its part. */
export type PropExtra =
	| { kind: "spotlight"; brightness: number; range: number; angle: number; color: Color3 }
	| { kind: "confetti" }
	| { kind: "sparks"; color: Color3 }
	| { kind: "title"; text: string; color: Color3 };

/** One part to build. */
export interface PropSpec {
	name: string;
	/** Which of the zone's terraces it dresses. */
	terrace: number;
	size: Vector3;
	cframe: CFrame;
	color: Color3;
	material: Enum.Material;
	collidable: boolean;
	transparency: number;
	/** Mounted flush on the terrace (floor lines, face strips): never in the way of a view. */
	flush: boolean;
	shape?: "Cylinder";
	extra?: PropExtra;
}

/** What the plan needs: the terraces, each one's giant scale, and the keep-clear boxes. */
export interface ArenaInput {
	terraces: readonly TerraceLayout[];
	/** The giant scale on each terrace, in the same order. */
	scales: readonly number[];
	keepClear: readonly Box[];
}

interface PropOptions {
	collidable?: boolean;
	transparency?: number;
	flush?: boolean;
	shape?: "Cylinder";
	extra?: PropExtra;
}

function prop(
	name: string,
	terrace: number,
	size: Vector3,
	cframe: CFrame,
	color: Color3,
	material: Enum.Material,
	options: PropOptions = {},
): PropSpec {
	return {
		name,
		terrace,
		size,
		cframe,
		color,
		material,
		collidable: options.collidable ?? false,
		transparency: options.transparency ?? 0,
		flush: options.flush ?? false,
		shape: options.shape,
		extra: options.extra,
	};
}

/** Whether a collidable prop at this box keeps its plan-view gap from every keep-clear box. */
export function clearOfKeepOut(box: Box, keepClear: readonly Box[]): boolean {
	for (const keep of keepClear) if (planGap(box, keep) < CLEAR_GAP) return false;
	return true;
}

/**
 * The inner edge of the side bands on a terrace: past every keep-clear box
 * that reaches into the stretch between `zBack` and `zFront`, plus the gap.
 */
export function sideBandInner(keepClear: readonly Box[], zBack: number, zFront: number): number {
	let inner = 0;
	for (const keep of keepClear) {
		if (keep.max.Z <= zBack - CLEAR_GAP || keep.min.Z >= zFront + CLEAR_GAP) continue;
		inner = math.max(inner, math.abs(keep.min.X), math.abs(keep.max.X));
	}
	return inner + CLEAR_GAP;
}

/** A thin bar from `a` to `b`, `thickness` square. */
function bar(a: Vector3, b: Vector3, thickness: number): [CFrame, Vector3] {
	const middle = a.Lerp(b, 0.5);
	return [CFrame.lookAt(middle, b), new Vector3(thickness, thickness, b.sub(a).Magnitude)];
}

/** Neon strips on the terrace block's faces, lane lines and an outline round the pedestal. */
function planTrim(index: number, layout: TerraceLayout, scale: number, out: PropSpec[]): void {
	const halfWidth = layout.width / 2;
	const depth = layout.frontZ - layout.backZ;
	const middleZ = (layout.frontZ + layout.backZ) / 2;
	const floor = layout.floorY;
	const flush = { flush: true };
	const material = Enum.Material.Neon;

	if (floor > 0) {
		// Faces of the raised block, just under the lip; the front and back skip the ramp.
		const stripY = floor - 1.5;
		const pieceLength = halfWidth - 9;
		for (const side of [-1, 1]) {
			const pieceX = side * (9 + pieceLength / 2);
			out.push(
				prop(
					"FrontStrip",
					index,
					new Vector3(pieceLength, 1, 0.5),
					new CFrame(pieceX, stripY, layout.frontZ + 0.25),
					NEON.cyan,
					material,
					flush,
				),
				prop(
					"BackStrip",
					index,
					new Vector3(pieceLength, 1, 0.5),
					new CFrame(pieceX, stripY, layout.backZ - 0.25),
					NEON.cyan,
					material,
					flush,
				),
				prop(
					"SideStrip",
					index,
					new Vector3(0.5, 1, depth),
					new CFrame(side * (halfWidth + 0.25), stripY, middleZ),
					NEON.magenta,
					material,
					flush,
				),
			);
		}
	}

	for (const side of [-1, 1]) {
		out.push(
			prop(
				"LaneLine",
				index,
				new Vector3(0.6, 0.1, depth),
				new CFrame(side * LANE_LINE_X, floor + 0.05, middleZ),
				NEON.cyan,
				material,
				flush,
			),
		);
	}

	// A gold square on the floor round the pedestal (10 * scale wide in staircase.ts).
	const giant = layout.giantPosition;
	const half = 5 * scale + 1.5;
	const length = 2 * half + 0.8;
	for (const side of [-1, 1]) {
		out.push(
			prop(
				"RingOutline",
				index,
				new Vector3(length, 0.1, 0.8),
				new CFrame(giant.X, floor + 0.05, giant.Z + side * half),
				NEON.gold,
				material,
				flush,
			),
			prop(
				"RingOutline",
				index,
				new Vector3(0.8, 0.1, length),
				new CFrame(giant.X + side * half, floor + 0.05, giant.Z),
				NEON.gold,
				material,
				flush,
			),
		);
	}
}

/** Two semi-transparent neon halos floating above the giant, well over its head. */
function planHalos(index: number, layout: TerraceLayout, scale: number, out: PropSpec[]): void {
	const giant = layout.giantPosition;
	const clearTop = layout.floorY + CLEAR_HEIGHT_PER_SCALE * scale + CLEAR_HEIGHT_BASE;
	const halos = [
		{ radius: 3.4 * scale, y: clearTop + 8, color: NEON.cyan },
		{ radius: 2.5 * scale, y: clearTop + 15, color: NEON.magenta },
	];
	for (const halo of halos) {
		const thickness = 0.12 * scale;
		const segment = ((2 * math.pi * halo.radius) / RING_SEGMENTS) * 1.04;
		for (let i = 0; i < RING_SEGMENTS; i++) {
			const angle = (2 * math.pi * i) / RING_SEGMENTS;
			const cframe = new CFrame(giant.X, halo.y, giant.Z)
				.mul(CFrame.Angles(0, angle, 0))
				.mul(new CFrame(halo.radius, 0, 0));
			out.push(
				prop("HoloRing", index, new Vector3(thickness, thickness, segment), cframe, halo.color, Enum.Material.Neon, {
					transparency: 0.4,
				}),
			);
		}
	}
}

/** An invisible sheet high over the terrace that rains confetti. */
function planConfetti(
	index: number,
	layout: TerraceLayout,
	scale: number,
	inner: number,
	zBack: number,
	zFront: number,
	out: PropSpec[],
): void {
	const y = layout.floorY + CLEAR_HEIGHT_PER_SCALE * scale + CLEAR_HEIGHT_BASE + 30;
	out.push(
		prop(
			"ConfettiSky",
			index,
			new Vector3(2 * inner, 1, zFront - zBack),
			new CFrame(0, y, (zFront + zBack) / 2),
			NEON.white,
			Enum.Material.SmoothPlastic,
			{ transparency: 1, extra: { kind: "confetti" } },
		),
	);
}

/** Rope posts with turnbuckle pads down one side, and three ropes between each pair. */
function planRopes(
	index: number,
	layout: TerraceLayout,
	scale: number,
	side: number,
	x: number,
	zBack: number,
	zFront: number,
	out: PropSpec[],
): void {
	const height = 1.1 * scale;
	const thickness = 0.24 * scale;
	const count = math.clamp(math.floor((zFront - zBack) / POST_SPACING) + 1, 2, MAX_POSTS);
	const step = (zFront - zBack - thickness) / (count - 1);
	const padColor = side < 0 ? ARENA.redCorner : ARENA.blueCorner;
	const floor = layout.floorY;
	const zs: number[] = [];
	for (let i = 0; i < count; i++) zs.push(zFront - thickness / 2 - i * step);

	for (const z of zs) {
		out.push(
			prop(
				"RopePost",
				index,
				new Vector3(height, thickness, thickness),
				new CFrame(side * x, floor + height / 2, z).mul(CFrame.Angles(0, 0, math.pi / 2)),
				ARENA.steel,
				Enum.Material.Metal,
				{ collidable: true, shape: "Cylinder" },
			),
			prop(
				"Turnbuckle",
				index,
				new Vector3(thickness * 1.3, 0.3 * scale, thickness * 1.3),
				new CFrame(side * x, floor + height - 0.15 * scale, z),
				padColor,
				Enum.Material.SmoothPlastic,
				{ collidable: true },
			),
		);
	}

	const ropeColors = [ARENA.redCorner, ARENA.ropeWhite, ARENA.blueCorner];
	for (let i = 1; i < zs.size(); i++) {
		ropeColors.forEach((color, level) => {
			const y = floor + height * (0.35 + 0.25 * level);
			const [cframe, size] = bar(new Vector3(side * x, y, zs[i - 1]), new Vector3(side * x, y, zs[i]), 0.5);
			out.push(prop("Rope", index, size, cframe, color, Enum.Material.SmoothPlastic));
		});
	}
}

/**
 * A light tower beside the giant: a collidable mast in the side band and a
 * non-collidable arm reaching in over the clear zone, above its top, to a
 * lamp aimed at the giant's chest.
 */
function planTower(
	index: number,
	layout: TerraceLayout,
	scale: number,
	side: number,
	x: number,
	inner: number,
	z: number,
	out: PropSpec[],
): void {
	const floor = layout.floorY;
	const height = CLEAR_HEIGHT_PER_SCALE * scale + 20;
	const mastX = side * x;
	out.push(
		prop(
			"LightMast",
			index,
			new Vector3(2.5, height, 2.5),
			new CFrame(mastX, floor + height / 2, z),
			ARENA.charcoal,
			Enum.Material.Metal,
			{ collidable: true },
		),
	);

	const lampX = side * math.max(inner - 16, LANE_LINE_X + 2);
	const [armCFrame, armSize] = bar(
		new Vector3(mastX, floor + height - 1, z),
		new Vector3(lampX, floor + height - 1, z),
		1.2,
	);
	out.push(prop("LightArm", index, armSize, armCFrame, ARENA.steel, Enum.Material.Metal));

	const giant = layout.giantPosition;
	const head = new Vector3(lampX, floor + height - 3.5, z);
	const aim = CFrame.lookAt(head, new Vector3(giant.X, floor + 3.5 * scale, giant.Z));
	out.push(
		prop("LampHead", index, new Vector3(4, 3, 4), aim, ARENA.charcoal, Enum.Material.Metal, {
			extra: { kind: "spotlight", brightness: 6, range: 60, angle: 55, color: NEON.white },
		}),
		prop(
			"LampLens",
			index,
			new Vector3(3.2, 2.2, 0.3),
			aim.mul(new CFrame(0, 0, -2.1)),
			NEON.white,
			Enum.Material.Neon,
			{ extra: { kind: "sparks", color: side < 0 ? NEON.magenta : NEON.cyan } },
		),
	);
}

/** Stepped stands rising outward to the terrace edge, with neon on each step and a seeded crowd. */
function planBleachers(
	index: number,
	layout: TerraceLayout,
	scale: number,
	side: number,
	start: number,
	outer: number,
	zBack: number,
	zFront: number,
	random: Random,
	out: PropSpec[],
): void {
	const floor = layout.floorY;
	const rowDepth = (outer - start) / BLEACHER_ROWS;
	const rise = 0.35 * scale;
	const length = zFront - zBack;
	const middleZ = (zFront + zBack) / 2;
	for (let row = 0; row < BLEACHER_ROWS; row++) {
		const rowStart = start + row * rowDepth;
		const width = outer - rowStart;
		const top = (row + 1) * rise;
		out.push(
			prop(
				"Bleacher",
				index,
				new Vector3(width, top, length),
				new CFrame(side * (rowStart + width / 2), floor + top / 2, middleZ),
				row % 2 === 0 ? ARENA.seat : ARENA.charcoal,
				Enum.Material.SmoothPlastic,
				{ collidable: true },
			),
			prop(
				"BleacherGlow",
				index,
				new Vector3(0.4, 0.4, length),
				new CFrame(side * (rowStart - 0.2), floor + top - 0.2, middleZ),
				row % 2 === 0 ? NEON.cyan : NEON.magenta,
				Enum.Material.Neon,
			),
		);
	}

	const fan = new Vector3(0.25 * scale, 0.45 * scale, 0.2 * scale);
	for (let i = 0; i < CROWD_PER_SIDE; i++) {
		const row = random.NextInteger(0, BLEACHER_ROWS - 1);
		const rowStart = start + row * rowDepth;
		const z = random.NextNumber(zBack + fan.Z, zFront - fan.Z);
		const color = CROWD_COLORS[random.NextInteger(0, CROWD_COLORS.size() - 1)];
		out.push(
			prop(
				"Fan",
				index,
				fan,
				new CFrame(side * (rowStart + rowDepth / 2), floor + (row + 1) * rise + fan.Y / 2, z),
				color,
				Enum.Material.SmoothPlastic,
			),
		);
	}
}

/** The title banner behind the top terrace's champion, on two pylons, above its head. */
function planBanner(index: number, layout: TerraceLayout, scale: number, x: number, z: number, out: PropSpec[]): void {
	const floor = layout.floorY;
	const bottom = floor + CLEAR_HEIGHT_PER_SCALE * scale + CLEAR_HEIGHT_BASE + 4;
	const boardHeight = 2.6 * scale;
	const boardWidth = 2 * x - 4;
	const pylonHeight = bottom - floor + boardHeight + 2;
	const centerY = bottom + boardHeight / 2;

	for (const side of [-1, 1]) {
		out.push(
			prop(
				"BannerPylon",
				index,
				new Vector3(3, pylonHeight, 3),
				new CFrame(side * x, floor + pylonHeight / 2, z),
				ARENA.charcoal,
				Enum.Material.Metal,
				{ collidable: true },
			),
			prop(
				"BannerCap",
				index,
				new Vector3(3.6, 1.2, 3.6),
				new CFrame(side * x, floor + pylonHeight + 0.6, z),
				NEON.magenta,
				Enum.Material.Neon,
			),
			prop(
				"BannerEdge",
				index,
				new Vector3(0.8, boardHeight + 0.8, 0.8),
				new CFrame(side * (boardWidth / 2), centerY, z + 0.6),
				NEON.gold,
				Enum.Material.Neon,
			),
			prop(
				"BannerEdge",
				index,
				new Vector3(boardWidth, 0.8, 0.8),
				new CFrame(0, centerY + side * (boardHeight / 2), z + 0.6),
				NEON.gold,
				Enum.Material.Neon,
			),
		);
	}
	out.push(
		prop(
			"ChampionshipBanner",
			index,
			new Vector3(boardWidth, boardHeight, 1),
			new CFrame(0, centerY, z),
			ARENA.board,
			Enum.Material.SmoothPlastic,
			{ extra: { kind: "title", text: "NEON ARENA CHAMPIONSHIP", color: NEON.gold } },
		),
		prop(
			"TitleBelt",
			index,
			new Vector3(0.22 * boardWidth, 0.25 * boardHeight, 0.6),
			new CFrame(0, bottom + 0.2 * boardHeight, z + 0.8),
			NEON.gold,
			Enum.Material.Metal,
		),
	);
}

/**
 * Every part of the Neon Arena, terrace by terrace. Collidable props stand
 * only in the side bands outside every keep-clear box, and any that would
 * still come within CLEAR_GAP of one (plan view) are dropped; everything
 * reaching over the lane is non-collidable and above the clear zones.
 */
export function planNeonArena(input: ArenaInput): PropSpec[] {
	const out: PropSpec[] = [];
	const random = new Random(ARENA_SEED);
	const top = input.terraces.size() - 1;

	input.terraces.forEach((layout, index) => {
		const scale = input.scales[index] ?? 1;
		const zFront = layout.frontZ - FRONT_MARGIN;
		const zBack = layout.backZ + BACK_MARGIN;
		const inner = sideBandInner(input.keepClear, zBack, zFront);
		const outer = layout.width / 2 - 1;
		const band = outer - inner;

		planTrim(index, layout, scale, out);
		planHalos(index, layout, scale, out);
		planConfetti(index, layout, scale, inner, zBack, zFront, out);
		if (zFront - zBack < 20) return;

		const towerZ = math.clamp(layout.giantPosition.Z + 1.5 * scale, zBack + 12, zFront - 3);
		for (const side of [-1, 1]) {
			if (band >= ROPE_OFFSET + 2) planRopes(index, layout, scale, side, inner + ROPE_OFFSET, zBack, zFront, out);
			if (band >= TOWER_OFFSET + 2) planTower(index, layout, scale, side, inner + TOWER_OFFSET, inner, towerZ, out);
			if (band >= BLEACHER_OFFSET + MIN_BLEACHER_DEPTH)
				planBleachers(index, layout, scale, side, inner + BLEACHER_OFFSET, outer, zBack, zFront, random, out);
		}
		if (index === top && band >= TOWER_OFFSET + 2)
			planBanner(index, layout, scale, inner + TOWER_OFFSET, zBack + 3, out);
	});

	return out.filter((spec) => !spec.collidable || clearOfKeepOut(boxOf(spec.cframe, spec.size), input.keepClear));
}
