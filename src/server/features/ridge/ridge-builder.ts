import { Box, splitBox } from "./box";
import { RidgeLayout, Terrace } from "./ridge-layout";

/** Name of the folder the ridge is built into, under Workspace. */
export const RIDGE_FOLDER_NAME = "Ridge";

/** Terraces are coloured in groups of four, loosely after the roster's zones. */
const GROUP_COLORS = [
	Color3.fromRGB(126, 170, 96), // 1–4 grassland
	Color3.fromRGB(214, 180, 112), // 5–8 desert
	Color3.fromRGB(160, 196, 216), // 9–12 winter
	Color3.fromRGB(88, 140, 86), // 13–16 forest
	Color3.fromRGB(146, 104, 160), // 17–20 chaos
	Color3.fromRGB(190, 96, 70), // 21–24 fire
	Color3.fromRGB(130, 136, 150), // 25–26 cyber
];
const BASE_COLOR = Color3.fromRGB(150, 150, 140);
const VALLEY_COLOR = Color3.fromRGB(92, 110, 70);
const LANE_COLOR = Color3.fromRGB(170, 60, 55);
const MARK_COLOR = Color3.fromRGB(245, 240, 225);
const BARRIER_COLOR = Color3.fromRGB(255, 80, 60);
const STAND_COLOR = Color3.fromRGB(90, 120, 200);
const POST_COLOR = Color3.fromRGB(45, 45, 50);
const LAMP_COLOR = Color3.fromRGB(255, 214, 140);
const SHOP_NAMES = ["Arms", "Aura", "Eggs"];

export interface RidgeModels {
	/** Not yet parented; the caller puts it in Workspace. */
	readonly folder: Folder;
	/** One model per terrace, indexed like the layout (0 is the base). */
	readonly terraces: readonly Model[];
}

function terraceColor(index: number): Color3 {
	if (index === 0) return BASE_COLOR;
	return GROUP_COLORS[math.min(math.floor((index - 1) / 4), GROUP_COLORS.size() - 1)];
}

function persistentModel(name: string, parent: Instance): Model {
	const model = new Instance("Model");
	model.Name = name;
	// Every terrace reaches every client, so the far giants are visible from the base.
	model.ModelStreamingMode = Enum.ModelStreamingMode.Persistent;
	model.Parent = parent;
	return model;
}

function styleAnchored(part: BasePart, name: string, color: Color3, material: Enum.Material): void {
	part.Name = name;
	part.Anchored = true;
	part.Color = color;
	part.Material = material;
	part.TopSurface = Enum.SurfaceType.Smooth;
	part.BottomSurface = Enum.SurfaceType.Smooth;
}

/** Parts for a box, split into pieces the engine can build. */
function addBox(
	parent: Instance,
	name: string,
	box: Box,
	color: Color3,
	material: Enum.Material = Enum.Material.SmoothPlastic,
): Part[] {
	return splitBox(box).map((piece) => {
		const part = new Instance("Part");
		styleAnchored(part, name, color, material);
		part.Size = piece.size;
		part.CFrame = new CFrame(piece.center);
		part.Parent = parent;
		return part;
	});
}

/** A label that stays upright over `adornee`, sized in studs so it reads at the scale of what it names. */
export function addLabel(adornee: BasePart, text: string, heightStuds: number, offsetStuds: number): BillboardGui {
	const gui = new Instance("BillboardGui");
	gui.Name = "Label";
	gui.Size = UDim2.fromScale(heightStuds * 5, heightStuds);
	gui.StudsOffsetWorldSpace = new Vector3(0, offsetStuds, 0);
	gui.LightInfluence = 0;
	gui.Adornee = adornee;
	const label = new Instance("TextLabel");
	label.Size = UDim2.fromScale(1, 1);
	label.BackgroundTransparency = 1;
	label.TextScaled = true;
	label.TextColor3 = new Color3(1, 1, 1);
	label.TextStrokeTransparency = 0;
	label.FontFace = Font.fromEnum(Enum.Font.GothamBold);
	label.Text = text;
	label.Parent = gui;
	gui.Parent = adornee;
	return gui;
}

/** A 1× lamp post: a 5-stud scale reference standing at `feet`. */
function addPost(parent: Instance, feet: Vector3): void {
	addBox(parent, "Post", { center: feet.add(new Vector3(0, 2.1, 0)), size: new Vector3(0.5, 4.2, 0.5) }, POST_COLOR);
	const [lamp] = addBox(
		parent,
		"Lamp",
		{ center: feet.add(new Vector3(0, 4.6, 0)), size: new Vector3(1, 0.8, 1) },
		LAMP_COLOR,
		Enum.Material.Neon,
	);
	lamp.CastShadow = false;
}

function buildTerrace(terrace: Terrace, parent: Instance): Model {
	const name = terrace.index === 0 ? "Base" : `Terrace${string.format("%02d", terrace.index)}`;
	const model = persistentModel(name, parent);
	const color = terraceColor(terrace.index);
	const h = terrace.arrivalHeight;

	addBox(model, "Block", terrace.block, color.Lerp(new Color3(), 0.35), Enum.Material.Slate);
	addBox(model, "Arrival", terrace.arrival, color);
	if (terrace.shops) addBox(model, "Shops", terrace.shops, color.Lerp(new Color3(1, 1, 1), 0.35));
	addBox(model, "Back", terrace.back, color);

	const fight = terrace.fight;
	if (fight) {
		addBox(model, "Lane", fight.lane, color.Lerp(LANE_COLOR, 0.6));
		const padSize = new Vector3(h, 0.2, h);
		addBox(model, "PlayerMark", { center: fight.playerMark.add(new Vector3(0, 0.1, 0)), size: padSize }, MARK_COLOR);
		addBox(model, "GiantMark", { center: fight.giantMark.add(new Vector3(0, 0.1, 0)), size: padSize }, MARK_COLOR);
	}

	terrace.shopStands.forEach((stand, i) => {
		const [part] = addBox(model, `Shop${SHOP_NAMES[i]}`, stand, STAND_COLOR);
		addLabel(part, SHOP_NAMES[i], 0.4 * h, stand.size.Y);
	});

	if (terrace.ramp) {
		// A WedgePart rises toward its local +Z, which is up the ridge.
		const ramp = new Instance("WedgePart");
		styleAnchored(ramp, "Ramp", color.Lerp(new Color3(1, 1, 1), 0.15), Enum.Material.SmoothPlastic);
		ramp.Size = terrace.ramp.size;
		ramp.CFrame = new CFrame(terrace.ramp.center);
		ramp.Parent = model;
	}

	if (terrace.barrier) {
		// A marker only: challenge order will do the gating, not geometry.
		for (const part of addBox(model, "Barrier", terrace.barrier, BARRIER_COLOR)) {
			part.Transparency = 0.6;
			part.CanCollide = false;
			part.CanQuery = false;
			part.CanTouch = false;
			part.CastShadow = false;
		}
	}

	const posts = new Instance("Folder");
	posts.Name = "Posts";
	posts.Parent = model;
	for (const feet of terrace.posts) addPost(posts, feet);

	if (terrace.index === 0) {
		const spawn = new Instance("SpawnLocation");
		spawn.Name = "Spawn";
		spawn.Anchored = true;
		spawn.Neutral = true;
		spawn.Duration = 0;
		spawn.Size = new Vector3(12, 0.2, 12);
		const center = terrace.arrivalPoint.add(new Vector3(0, 0.1, 0));
		// Players spawn facing the spawn's front: up the ridge, toward terrace 1.
		spawn.CFrame = CFrame.lookAt(center, center.add(new Vector3(0, 0, 1)));
		spawn.TopSurface = Enum.SurfaceType.Smooth;
		spawn.Color = MARK_COLOR;
		spawn.Parent = model;
	}

	return model;
}

/**
 * Builds the ridge's Parts from its layout: the valley floor, then the base
 * and every terrace as a persistent model. Giants are placed separately.
 */
export function buildRidge(layout: RidgeLayout): RidgeModels {
	const folder = new Instance("Folder");
	folder.Name = RIDGE_FOLDER_NAME;

	const valley = persistentModel("Valley", folder);
	addBox(valley, "Floor", layout.valley, VALLEY_COLOR, Enum.Material.Grass);

	const terraces = layout.terraces.map((terrace) => buildTerrace(terrace, folder));
	return { folder, terraces };
}
