import { CollectionService } from "@rbxts/services";
import {
	POWER_ATTRIBUTE,
	SIZE_ATTRIBUTE,
	type OutlineTier,
	type PowerTier,
	type SizeTier,
} from "shared/features/boosts/boost-catalog";
import { ANIMATION_SCALE_ATTRIBUTE, SCALED_GIANT_TAG } from "shared/features/encounter/giant-scale";

const OUTLINE_NAME = "BoostOutline";
/** The Humanoid's avatar-scaling values a size multiplies. */
const SCALE_VALUES = ["BodyWidthScale", "BodyHeightScale", "BodyDepthScale", "HeadScale"];
/** Where a scale value keeps the avatar's own value, so sizes multiply it rather than replace it. */
const AVATAR_VALUE_ATTRIBUTE = "AvatarValue";
/** The largest size grown through the scale values; every garment still fits there (docs/giant-scaling.md). */
const VALUES_PATH_MAX_SCALE = 2.5;

/**
 * Grows a body to `scale` times its avatar's own size, undoing any size it had.
 * Up to 2.5x through the Humanoid's scale values, which animate correctly;
 * above, through Model:ScaleTo, which keeps layered clothing fitting, with the
 * body tagged for each client's animation fix-up exactly as a large giant is
 * (GiantScaleController). The tag comes off and back on with every change so
 * the fix-up reads the new scale.
 */
function sizeCharacter(character: Model, scale: number): void {
	const humanoid = character.FindFirstChildOfClass("Humanoid");
	if (humanoid === undefined) return;
	const current = character.GetAttribute(SIZE_ATTRIBUTE);
	if ((typeIs(current, "number") ? current : 1) === scale) return;
	const r15 = humanoid.RigType === Enum.HumanoidRigType.R15;
	const viaValues = r15 && scale <= VALUES_PATH_MAX_SCALE;

	CollectionService.RemoveTag(character, SCALED_GIANT_TAG);
	character.SetAttribute(ANIMATION_SCALE_ATTRIBUTE, undefined);
	if (character.GetScale() !== 1) character.ScaleTo(1);

	for (const name of SCALE_VALUES) {
		const value = humanoid.FindFirstChild(name);
		if (!value?.IsA("NumberValue")) continue;
		const stored = value.GetAttribute(AVATAR_VALUE_ATTRIBUTE);
		const avatar = typeIs(stored, "number") ? stored : value.Value;
		value.SetAttribute(AVATAR_VALUE_ATTRIBUTE, avatar);
		value.Value = viaValues ? avatar * scale : avatar;
	}

	if (!viaValues && scale !== 1) {
		character.ScaleTo(scale);
		character.SetAttribute(ANIMATION_SCALE_ATTRIBUTE, scale);
		CollectionService.AddTag(character, SCALED_GIANT_TAG);
	}
	character.SetAttribute(SIZE_ATTRIBUTE, scale === 1 ? undefined : scale);
}

/**
 * Dresses a body in the outline, power and size it wears, replacing any it
 * wore before; undefined takes that one off. The outline is a Highlight round
 * the whole body, made here so every player sees it. The power is only named,
 * in the body's POWER_ATTRIBUTE: every client draws it (PowerEffectsController).
 * The size grows the body itself; call this only once the avatar's appearance
 * has loaded, or loading it resets the scale values.
 */
export function dressCharacter(
	character: Model,
	outlineTier?: OutlineTier,
	powerTier?: PowerTier,
	sizeTier?: SizeTier,
): void {
	character.FindFirstChild(OUTLINE_NAME)?.Destroy();
	if (outlineTier !== undefined) {
		const highlight = new Instance("Highlight");
		highlight.Name = OUTLINE_NAME;
		highlight.FillTransparency = 1;
		highlight.OutlineTransparency = 0;
		highlight.OutlineColor = outlineTier.color;
		highlight.DepthMode = Enum.HighlightDepthMode.Occluded;
		highlight.Parent = character;
	}
	sizeCharacter(character, sizeTier?.scale ?? 1);
	// After the size, so a client redrawing the power sees the body at its new size.
	character.SetAttribute(POWER_ATTRIBUTE, powerTier?.id);
}
