import { CollectionService, ServerStorage } from "@rbxts/services";
import { ANIMATION_SCALE_ATTRIBUTE, SCALED_GIANT_TAG } from "shared/features/encounter/giant-scale";
import { isWeaponAccessory } from "./giant-weapons";
import type { GiantDefinition } from "./giants";

/** Roblox's default R15 idle: free to play in any game. */
const IDLE_ANIMATION = "rbxassetid://507766666";
/** The Humanoid's avatar-scaling values the prefabs keep at 1 for base scale. */
const SCALE_VALUES = ["BodyWidthScale", "BodyHeightScale", "BodyDepthScale", "HeadScale"];
/** The largest scale sized through the body-scale values; every garment still fits there. */
const VALUES_PATH_MAX_SCALE = 2.5;

/**
 * Sizes a giant through its Humanoid's body-scale values rather than
 * Model:ScaleTo. On this path the Animator moves joints by the scale, not its
 * square, so animation tracks play correctly; garments fit up to 2.5x but some
 * vanish from about 4x (docs/giant-scaling.md, sections 4.2 and 4.3).
 */
function scaleByValues(model: Model, scale: number): void {
	const humanoid = model.FindFirstChildOfClass("Humanoid");
	if (humanoid === undefined) return;
	for (const name of SCALE_VALUES) {
		let value = humanoid.FindFirstChild(name);
		if (!value?.IsA("NumberValue")) {
			const created = new Instance("NumberValue");
			created.Name = name;
			created.Value = 1;
			created.Parent = humanoid;
			value = created;
		}
		(value as NumberValue).Value = scale;
	}
}

/**
 * Sizes a giant: up to 2.5x through the body-scale values; above, where those
 * lose layered clothing, through Model:ScaleTo, which keeps every garment
 * fitting but makes the Animator move joints by the scale squared. Such a
 * giant is tagged, and each client divides its joint translations back down
 * (GiantScaleController; docs/giant-scaling.md, sections 5 and 7). The server
 * leaves its own joints uncorrected: nothing here reads a giant's posed parts.
 */
function scaleGiant(model: Model, scale: number): void {
	if (scale <= VALUES_PATH_MAX_SCALE) {
		scaleByValues(model, scale);
		return;
	}
	model.ScaleTo(scale);
	model.SetAttribute(ANIMATION_SCALE_ATTRIBUTE, scale);
	CollectionService.AddTag(model, SCALED_GIANT_TAG);
}

/**
 * A fresh, scaled copy of a giant's prefab, parented to `parent` (the engine
 * scales a rig in place, so it must be in the world first), or undefined
 * when the prefab is missing. Only the root is anchored: the body hangs off
 * it by its joints, so animation tracks and posed joints can move it.
 * Weapons come off: giants fight bare-handed (giant-weapons.ts).
 */
export function cloneGiant(giant: GiantDefinition, parent: Instance): Model | undefined {
	const prefab = ServerStorage.FindFirstChild("Giants")?.FindFirstChild(giant.modelId);
	if (!prefab?.IsA("Model")) {
		warn(`[push-a-giant] giant prefab ServerStorage.Giants.${giant.modelId} is missing`);
		return undefined;
	}

	const model = prefab.Clone();
	for (const child of model.GetChildren()) {
		if (child.IsA("Accessory") && isWeaponAccessory(child.Name)) child.Destroy();
	}
	const humanoid = model.FindFirstChildOfClass("Humanoid");
	if (humanoid) {
		humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None;
		humanoid.HealthDisplayType = Enum.HumanoidHealthDisplayType.AlwaysOff;
	}
	if (model.PrimaryPart) model.PrimaryPart.Anchored = true;
	model.Parent = parent;
	scaleGiant(model, giant.scale);
	return model;
}

/**
 * Loops the default idle on a giant. Played by the server, so it replicates
 * to every client that has the giant; clients layer their own posing on top.
 */
export function startIdle(model: Model): void {
	const animator = model.FindFirstChildOfClass("Humanoid")?.FindFirstChildOfClass("Animator");
	if (animator === undefined) return;
	const animation = new Instance("Animation");
	animation.AnimationId = IDLE_ANIMATION;
	const track = animator.LoadAnimation(animation);
	track.Looped = true;
	track.Priority = Enum.AnimationPriority.Idle;
	track.Play();
}

/** The lowest point of a part's box, wherever it is turned. */
function lowestPoint(part: BasePart): number {
	const half = part.Size.div(2);
	let lowest = math.huge;
	for (const x of [-1, 1]) {
		for (const y of [-1, 1]) {
			for (const z of [-1, 1]) {
				lowest = math.min(lowest, part.CFrame.PointToWorldSpace(half.mul(new Vector3(x, y, z))).Y);
			}
		}
	}
	return lowest;
}

/**
 * Where a model touches the ground: the lower of its feet, or, for a model
 * without them, its lowest point. Feet first, so a weapon or cape that hangs
 * below them cannot lift the body off the floor.
 */
function groundHeight(model: Model): number {
	let feet = math.huge;
	for (const name of ["LeftFoot", "RightFoot"]) {
		const foot = model.FindFirstChild(name);
		if (foot?.IsA("BasePart")) feet = math.min(feet, lowestPoint(foot));
	}
	if (feet < math.huge) return feet;
	const [box, size] = model.GetBoundingBox();
	return box.Position.Y - size.Y / 2;
}

/** Pivots a model to `floor`, then lifts or lowers it until its feet touch the floor's height. */
export function placeOnFloor(model: Model, floor: CFrame): void {
	model.PivotTo(floor);
	model.PivotTo(floor.add(new Vector3(0, floor.Position.Y - groundHeight(model), 0)));
}
