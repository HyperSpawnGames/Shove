import { CollectionService } from "@rbxts/services";
import { OPENS_AT_ATTRIBUTE, STAIRCASE_LOCK_TAG } from "shared/features/encounter/encounter-attributes";
import { cloneGiant, placeOnFloor } from "./giant-models";
import type { GiantDefinition } from "./giants";
import { rampLayout, TerraceLayout, terraceLayout } from "./world-layout";

/** The bottom of every raised terrace block: the underside of the baseplate. */
const GROUND_BOTTOM_Y = -16;
const RAMP_WIDTH = 16;
const RAMP_THICKNESS = 2;
const GATE_HEIGHT = 14;
const PEDESTAL_HEIGHT = 1;
/** Studs in front of a giant (toward the spawn) where a finished fight puts the player back. */
const RETURN_DISTANCE = 12;

const TERRACE_COLORS = [
	Color3.fromRGB(120, 170, 90),
	Color3.fromRGB(190, 160, 110),
	Color3.fromRGB(150, 160, 175),
	Color3.fromRGB(170, 120, 110),
];

export interface StaircaseGiant {
	prompt: ProximityPrompt;
	/** Where the player goes after a fight against this giant. */
	returnTo: CFrame;
}

function part(parent: Instance, name: string, size: Vector3, cframe: CFrame, color: Color3, material: Enum.Material) {
	const instance = new Instance("Part");
	instance.Name = name;
	instance.Anchored = true;
	instance.Size = size;
	instance.CFrame = cframe;
	instance.Color = color;
	instance.Material = material;
	instance.TopSurface = Enum.SurfaceType.Smooth;
	instance.BottomSurface = Enum.SurfaceType.Smooth;
	instance.Parent = parent;
	return instance;
}

function lock(instance: Instance, opensAt: number): void {
	instance.SetAttribute(OPENS_AT_ATTRIBUTE, opensAt);
	CollectionService.AddTag(instance, STAIRCASE_LOCK_TAG);
}

function label(parent: Instance, text: string, offset: Vector3, size: UDim2): void {
	const billboard = new Instance("BillboardGui");
	billboard.Size = size;
	billboard.StudsOffsetWorldSpace = offset;
	billboard.MaxDistance = 200;
	billboard.Parent = parent;
	const textLabel = new Instance("TextLabel");
	textLabel.Size = UDim2.fromScale(1, 1);
	textLabel.BackgroundTransparency = 1;
	textLabel.Font = Enum.Font.GothamBlack;
	textLabel.TextScaled = true;
	textLabel.TextColor3 = new Color3(1, 1, 1);
	textLabel.TextStrokeTransparency = 0.2;
	textLabel.RichText = true;
	textLabel.Text = text;
	textLabel.Parent = billboard;
}

/** Terrace `tier`'s raised block. Tier 0 is the baseplate and gets none. */
export function buildTerrace(parent: Instance, tier: number, layout: TerraceLayout): void {
	if (tier === 0) return;
	const depth = layout.frontZ - layout.backZ;
	const height = layout.floorY - GROUND_BOTTOM_Y;
	part(
		parent,
		`Terrace${tier}`,
		new Vector3(layout.width, height, depth),
		new CFrame(0, GROUND_BOTTOM_Y + height / 2, (layout.frontZ + layout.backZ) / 2),
		TERRACE_COLORS[tier % TERRACE_COLORS.size()],
		Enum.Material.Grass,
	);
}

/**
 * The ramp up to terrace `tier`, and the gate wall across that terrace's
 * whole front edge, which only beating `below` opens.
 */
export function buildRamp(parent: Instance, tier: number, below: GiantDefinition): void {
	const ramp = rampLayout(tier);
	if (ramp === undefined) return;

	const length = ramp.to.sub(ramp.from).Magnitude + 2;
	const middle = ramp.from.Lerp(ramp.to, 0.5);
	const surface = CFrame.lookAt(middle, ramp.to).mul(new CFrame(0, -RAMP_THICKNESS / 2, 0));
	part(
		parent,
		`Ramp${tier}`,
		new Vector3(RAMP_WIDTH, RAMP_THICKNESS, length),
		surface,
		Color3.fromRGB(110, 110, 120),
		Enum.Material.Slate,
	);

	const upper = terraceLayout(tier);
	const gate = part(
		parent,
		`Gate${tier}`,
		new Vector3(upper.width, GATE_HEIGHT, 1),
		new CFrame(0, upper.floorY + GATE_HEIGHT / 2, upper.frontZ - 0.5),
		Color3.fromRGB(80, 170, 255),
		Enum.Material.ForceField,
	);
	gate.Transparency = 0.2;
	label(
		gate,
		`Defeat the ${below.displayName} to open`,
		new Vector3(0, GATE_HEIGHT / 2 + 2, 0),
		UDim2.fromOffset(320, 50),
	);
	lock(gate, tier);
}

/** Giant `tier` on its pedestal, facing the spawn, with its sign and Challenge prompt. */
export function buildGiant(
	parent: Instance,
	tier: number,
	giant: GiantDefinition,
	layout: TerraceLayout,
): StaircaseGiant | undefined {
	const model = cloneGiant(giant);
	if (model === undefined) return undefined;

	const position = layout.giantPosition;
	part(
		parent,
		`${giant.modelId}Pedestal`,
		new Vector3(10 * giant.scale, PEDESTAL_HEIGHT, 10 * giant.scale),
		new CFrame(position.add(new Vector3(0, PEDESTAL_HEIGHT / 2, 0))),
		Color3.fromRGB(90, 90, 100),
		Enum.Material.Slate,
	);

	const standing = position.add(new Vector3(0, PEDESTAL_HEIGHT, 0));
	placeOnFloor(model, CFrame.lookAt(standing, standing.add(new Vector3(0, 0, 1))));
	model.Name = giant.modelId;
	model.Parent = parent;

	const root = model.PrimaryPart ?? model.FindFirstChild("HumanoidRootPart");
	if (!root?.IsA("BasePart")) return undefined;
	const [, size] = model.GetBoundingBox();
	label(
		root,
		`${giant.displayName}\n<font color="#FFC850">${giant.recommendedStrength} Strength</font>  <font color="#6EC8FF">+${giant.winsPayout} Wins</font>`,
		new Vector3(0, size.Y / 2 + 2.5, 0),
		UDim2.fromOffset(260, 90),
	);

	const prompt = new Instance("ProximityPrompt");
	prompt.ActionText = "Challenge";
	prompt.ObjectText = giant.displayName;
	prompt.KeyboardKeyCode = Enum.KeyCode.E;
	prompt.HoldDuration = 0;
	prompt.MaxActivationDistance = 10 + 4 * giant.scale;
	prompt.RequiresLineOfSight = false;
	prompt.Parent = root;
	lock(prompt, tier);

	const returnSpot = position.add(new Vector3(0, 3, RETURN_DISTANCE + 4 * giant.scale));
	const returnTo = CFrame.lookAt(returnSpot, new Vector3(position.X, returnSpot.Y, position.Z));
	return { prompt, returnTo };
}
