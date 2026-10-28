import { POWER_ATTRIBUTE, type OutlineTier, type PowerTier } from "shared/features/boosts/boost-catalog";

const OUTLINE_NAME = "BoostOutline";

/**
 * Dresses a body in the outline and power it wears, replacing any it wore
 * before; undefined takes that one off. The outline is a Highlight round the
 * whole body, made here so every player sees it. The power is only named, in
 * the body's POWER_ATTRIBUTE: every client draws it (PowerEffectsController).
 */
export function dressCharacter(character: Model, outlineTier?: OutlineTier, powerTier?: PowerTier): void {
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
	character.SetAttribute(POWER_ATTRIBUTE, powerTier?.id);
}
