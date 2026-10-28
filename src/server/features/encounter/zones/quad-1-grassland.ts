import { extraClearZones, GRASSLAND_PART_BUDGET, planGrassland, terraceColor } from "./quad-1/plan";
import { planBoundaryWalls } from "./quad-1/boundary-walls";
import type { PartSpec } from "./quad-1/part-spec";
import { planSpawnMeadow } from "./quad-1/spawn-meadow";
import type { ZoneBuilder } from "./types";

const SHAPES = {
	block: Enum.PartType.Block,
	ball: Enum.PartType.Ball,
	cylinder: Enum.PartType.Cylinder,
};
const POLLEN_TEXTURE = "rbxasset://textures/particles/sparkles_main.dds";

function addSign(part: Part, text: string): void {
	const gui = new Instance("SurfaceGui");
	gui.Face = Enum.NormalId.Back;
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud;
	gui.PixelsPerStud = 40;
	gui.Parent = part;
	const label = new Instance("TextLabel");
	label.Size = UDim2.fromScale(1, 1);
	label.BackgroundTransparency = 1;
	label.Font = Enum.Font.FredokaOne;
	label.TextScaled = true;
	label.TextColor3 = Color3.fromRGB(255, 244, 214);
	label.TextStrokeColor3 = Color3.fromRGB(70, 44, 24);
	label.TextStrokeTransparency = 0;
	label.Text = text;
	label.Parent = gui;
}

function addPollen(part: Part): void {
	const emitter = new Instance("ParticleEmitter");
	emitter.Texture = POLLEN_TEXTURE;
	emitter.Rate = 1.5;
	emitter.Lifetime = new NumberRange(4, 6);
	emitter.Speed = new NumberRange(0.3, 0.8);
	emitter.SpreadAngle = new Vector2(180, 180);
	emitter.Acceleration = new Vector3(0, 0.25, 0);
	emitter.Drag = 0.5;
	emitter.Size = new NumberSequence(0.15);
	emitter.Color = new ColorSequence(Color3.fromRGB(255, 236, 140));
	emitter.LightEmission = 0.6;
	emitter.Transparency = new NumberSequence([
		new NumberSequenceKeypoint(0, 1),
		new NumberSequenceKeypoint(0.2, 0.3),
		new NumberSequenceKeypoint(0.8, 0.3),
		new NumberSequenceKeypoint(1, 1),
	]);
	emitter.Parent = part;
}

function buildPart(spec: PartSpec, parent: Instance): void {
	const part = new Instance("Part");
	part.Name = spec.name;
	part.Shape = SHAPES[spec.shape];
	part.Anchored = true;
	part.Size = spec.size;
	part.CFrame = spec.cframe;
	part.Color = spec.color;
	part.Material = spec.material;
	part.CanCollide = spec.collide;
	part.CanQuery = spec.collide;
	part.CanTouch = false;
	part.CastShadow = spec.collide;
	part.TopSurface = Enum.SurfaceType.Smooth;
	part.BottomSurface = Enum.SurfaceType.Smooth;
	if (spec.sign !== undefined) addSign(part, spec.sign);
	if (spec.pollen) addPollen(part);
	part.Parent = parent;
}

/**
 * Quad 1's environment: the Grassland, the first thing a new player sees.
 * Grass terraces in two alternating greens, each with a dirt path up its
 * lane, a split-rail fence, low round trees, bushes, rocks and wildflowers;
 * a signpost at the foot pointing up the climb; and a meadow of rolling
 * hills either side; and, when the quad starts on the ground, the spawn
 * meadow around the spawn pad, so the first thing a player sees is already
 * the Grassland, ringed by mega cobblestone walls. Placement is planned in
 * quad-1/plan.ts, spawn-meadow.ts and boundary-walls.ts.
 */
export const buildGrasslandZone: ZoneBuilder = (context) => {
	for (const part of context.terraceParts) {
		const index = context.terraces.findIndex(
			(terrace) => math.abs((terrace.frontZ + terrace.backZ) / 2 - part.Position.Z) < 1,
		);
		part.Material = Enum.Material.Grass;
		part.Color = terraceColor(math.max(index, 0));
	}

	const first = context.terraces[0];
	const plan = planGrassland(context);
	if (plan.size() > GRASSLAND_PART_BUDGET)
		warn(`[push-a-giant] Grassland planned ${plan.size()} parts; building the first ${GRASSLAND_PART_BUDGET}`);
	const folders = new Map<string, Folder>();
	plan.forEach((spec, i) => {
		if (i >= GRASSLAND_PART_BUDGET) return;
		let folder = folders.get(spec.group);
		if (folder === undefined) {
			folder = new Instance("Folder");
			folder.Name = spec.group;
			folder.Parent = context.folder;
			folders.set(spec.group, folder);
		}
		buildPart(spec, folder);
	});

	// The spawn meadow has its own budget (enforced in its plan), so it never crowds out the climb.
	if (first !== undefined && first.floorY === 0) {
		const meadow = new Instance("Folder");
		meadow.Name = "SpawnMeadow";
		meadow.Parent = context.folder;
		const keepClear = [...context.clearZones, ...extraClearZones(context)];
		for (const spec of planSpawnMeadow(first, keepClear)) buildPart(spec, meadow);

		const walls = new Instance("Folder");
		walls.Name = "BoundaryWalls";
		walls.Parent = context.folder;
		for (const spec of planBoundaryWalls(context.terraces)) buildPart(spec, walls);
	}
};
