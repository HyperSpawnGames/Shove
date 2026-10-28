import { CollectionService } from "@rbxts/services";
import {
	GIANT_FLOOR_ATTRIBUTE,
	LOBBY_GIANT_TAG,
	OPENS_AT_ATTRIBUTE,
	STAIRCASE_LOCK_TAG,
} from "shared/features/encounter/encounter-attributes";
import { formatNumber } from "shared/format-number";
import { GATE_GROUP } from "./gate-collision";
import { cloneGiant, placeOnFloor, startIdle } from "./giant-models";
import type { GiantDefinition } from "./giants";
import { RampLayout, rampBetween, TerraceLayout } from "./world-layout";
import type { ClearZone } from "./zones/types";

/** The bottom of every raised terrace block: the underside of the baseplate. */
const GROUND_BOTTOM_Y = -16;
const RAMP_WIDTH = 16;
const RAMP_THICKNESS = 2;
const GATE_HEIGHT = 14;
const PEDESTAL_HEIGHT = 1;
/** How far away a gate's sign shows, and a giant's: about the reach of its own terrace. */
const GATE_SIGN_DISTANCE = 70;
const GIANT_SIGN_BASE_DISTANCE = 50;
const GIANT_SIGN_DISTANCE_PER_SCALE = 12;
/** Studs in front of a giant (toward the spawn) where a finished fight puts the player back. */
const RETURN_DISTANCE = 12;

/** A neutral grass; each zone's environment restyles its own terraces. */
const TERRACE_COLOR = Color3.fromRGB(120, 170, 90);

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

/**
 * A floating sign. `maxDistance` keeps it to its own stretch of the climb:
 * signs face the camera and draw over what is behind them, so a long reach
 * stacks the next giants' signs over the one the player is standing at.
 */
function label(parent: Instance, text: string, offset: Vector3, size: UDim2, maxDistance: number): void {
	const billboard = new Instance("BillboardGui");
	billboard.Size = size;
	billboard.StudsOffsetWorldSpace = offset;
	billboard.MaxDistance = maxDistance;
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

/** Slot `slot`'s raised block, or undefined for slot 0, which is the baseplate. */
export function buildTerrace(parent: Instance, slot: number, layout: TerraceLayout): BasePart | undefined {
	if (slot === 0) return undefined;
	const depth = layout.frontZ - layout.backZ;
	const height = layout.floorY - GROUND_BOTTOM_Y;
	return part(
		parent,
		`Terrace${slot}`,
		new Vector3(layout.width, height, depth),
		new CFrame(0, GROUND_BOTTOM_Y + height / 2, (layout.frontZ + layout.backZ) / 2),
		TERRACE_COLOR,
		Enum.Material.Grass,
	);
}

/** A gate on a ramp: the progress that opens it, and the giant to beat. */
export interface GateSpec {
	opensAt: number;
	beat: GiantDefinition;
}

/**
 * The ramp up onto slot `slot`, and, when `gate` is given, a gate wall
 * across that terrace's whole front edge, which only beating `gate.beat`
 * opens.
 */
export function buildRamp(
	parent: Instance,
	slot: number,
	lower: TerraceLayout,
	upper: TerraceLayout,
	gate?: GateSpec,
): RampLayout {
	const ramp = rampBetween(lower, upper);
	const length = ramp.to.sub(ramp.from).Magnitude + 2;
	const middle = ramp.from.Lerp(ramp.to, 0.5);
	const surface = CFrame.lookAt(middle, ramp.to).mul(new CFrame(0, -RAMP_THICKNESS / 2, 0));
	part(
		parent,
		`Ramp${slot}`,
		new Vector3(RAMP_WIDTH, RAMP_THICKNESS, length),
		surface,
		Color3.fromRGB(110, 110, 120),
		Enum.Material.Slate,
	);
	if (gate === undefined) return ramp;

	const wall = part(
		parent,
		`Gate${slot}`,
		new Vector3(upper.width, GATE_HEIGHT, 1),
		new CFrame(0, upper.floorY + GATE_HEIGHT / 2, upper.frontZ - 0.5),
		Color3.fromRGB(80, 170, 255),
		Enum.Material.ForceField,
	);
	wall.Transparency = 0.2;
	wall.CollisionGroup = GATE_GROUP;
	label(
		wall,
		`Defeat the ${gate.beat.displayName} to open`,
		new Vector3(0, GATE_HEIGHT / 2 + 2, 0),
		UDim2.fromOffset(320, 50),
		GATE_SIGN_DISTANCE,
	);
	lock(wall, gate.opensAt);
	return ramp;
}

/**
 * The keep-clear boxes around a giant on `layout`: its pedestal with room to
 * stand and challenge, out to where a finished fight puts the player back.
 */
export function giantClearZone(giant: GiantDefinition, layout: TerraceLayout): ClearZone {
	const reach = RETURN_DISTANCE + 4 * giant.scale + 4;
	const width = 10 * giant.scale + 12;
	const floor = layout.giantPosition;
	const height = 6 * giant.scale + 10;
	return {
		cframe: new CFrame(floor.X, floor.Y + height / 2, floor.Z + reach / 2 - 5 * giant.scale),
		size: new Vector3(width, height, reach + 10 * giant.scale),
	};
}

/** The walking lane along the middle of a terrace, from its front edge to its back edge. */
export function laneClearZone(layout: TerraceLayout): ClearZone {
	const depth = layout.frontZ - layout.backZ;
	return {
		cframe: new CFrame(0, layout.floorY + 6, (layout.frontZ + layout.backZ) / 2),
		size: new Vector3(RAMP_WIDTH + 4, 12, depth),
	};
}

/** Giant `index` on its pedestal, facing the spawn, with its sign and Challenge prompt. */
export function buildGiant(
	parent: Instance,
	index: number,
	giant: GiantDefinition,
	layout: TerraceLayout,
): StaircaseGiant | undefined {
	const model = cloneGiant(giant, parent);
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
	model.SetAttribute(GIANT_FLOOR_ATTRIBUTE, standing.Y);
	CollectionService.AddTag(model, LOBBY_GIANT_TAG);
	startIdle(model);

	const root = model.PrimaryPart ?? model.FindFirstChild("HumanoidRootPart");
	if (!root?.IsA("BasePart")) return undefined;
	const [, size] = model.GetBoundingBox();
	label(
		root,
		`${giant.displayName}\n<font color="#FFC850">${formatNumber(giant.recommendedStrength)} Strength</font>  <font color="#6EC8FF">+${formatNumber(giant.winsPayout)} Wins</font>`,
		new Vector3(0, size.Y / 2 + 2.5, 0),
		UDim2.fromOffset(260, 90),
		GIANT_SIGN_BASE_DISTANCE + GIANT_SIGN_DISTANCE_PER_SCALE * giant.scale,
	);

	const prompt = new Instance("ProximityPrompt");
	prompt.ActionText = "Challenge";
	prompt.ObjectText = giant.displayName;
	prompt.KeyboardKeyCode = Enum.KeyCode.E;
	prompt.HoldDuration = 0;
	prompt.MaxActivationDistance = 10 + 4 * giant.scale;
	prompt.RequiresLineOfSight = false;
	prompt.Parent = root;
	lock(prompt, index);

	const returnSpot = position.add(new Vector3(0, 3, RETURN_DISTANCE + 4 * giant.scale));
	const returnTo = CFrame.lookAt(returnSpot, new Vector3(position.X, returnSpot.Y, position.Z));
	return { prompt, returnTo };
}
