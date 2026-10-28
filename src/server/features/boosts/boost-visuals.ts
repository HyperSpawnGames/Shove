import type { OutlineTier, PowerTier } from "shared/features/boosts/boost-catalog";

const OUTLINE_NAME = "BoostOutline";
const POWER_NAME = "BoostPower";
/** Where a power burns: both hands and both feet (R15 parts, then R6 limbs). */
const R15_LIMBS = ["RightHand", "LeftHand", "RightFoot", "LeftFoot"];
const R6_LIMBS = ["Right Arm", "Left Arm", "Right Leg", "Left Leg"];
/** Seconds to wait for a fresh body's limbs. */
const LIMB_WAIT_SECONDS = 5;

function outline(character: Model, tier: OutlineTier): void {
	const highlight = new Instance("Highlight");
	highlight.Name = OUTLINE_NAME;
	highlight.FillTransparency = 1;
	highlight.OutlineTransparency = 0;
	highlight.OutlineColor = tier.color;
	highlight.DepthMode = Enum.HighlightDepthMode.Occluded;
	highlight.Parent = character;
}

function burn(limb: BasePart, tier: PowerTier, r6: boolean): void {
	const attachment = new Instance("Attachment");
	attachment.Name = POWER_NAME;
	// An R6 limb is a whole arm or leg; the power sits at its hand or foot end.
	if (r6) attachment.Position = new Vector3(0, -limb.Size.Y / 2, 0);
	const emitter = new Instance("ParticleEmitter");
	emitter.Texture = tier.texture;
	emitter.Color = new ColorSequence(tier.color);
	emitter.LightEmission = 1;
	emitter.Size = new NumberSequence([new NumberSequenceKeypoint(0, 1.1), new NumberSequenceKeypoint(1, 0)]);
	emitter.Transparency = new NumberSequence([new NumberSequenceKeypoint(0, 0), new NumberSequenceKeypoint(1, 1)]);
	emitter.Lifetime = new NumberRange(0.4, 0.8);
	emitter.Rate = 45;
	emitter.Speed = new NumberRange(1, 2.5);
	emitter.SpreadAngle = new Vector2(180, 180);
	emitter.Drag = 3;
	emitter.Rotation = new NumberRange(0, 360);
	emitter.RotSpeed = new NumberRange(-90, 90);
	emitter.Parent = attachment;
	attachment.Parent = limb;
}

/**
 * Dresses a body in the outline and power it wears, replacing any it wore
 * before; undefined takes that one off. The outline is a Highlight round the
 * whole body; the power is particles at both hands and both feet. Made on the
 * server, so every player sees them. Yields while a fresh body's limbs load.
 */
export function dressCharacter(character: Model, outlineTier?: OutlineTier, powerTier?: PowerTier): void {
	character.FindFirstChild(OUTLINE_NAME)?.Destroy();
	for (const descendant of character.GetDescendants()) {
		if (descendant.Name === POWER_NAME && descendant.IsA("Attachment")) descendant.Destroy();
	}

	if (outlineTier !== undefined) outline(character, outlineTier);
	if (powerTier === undefined) return;

	const humanoid = character.FindFirstChildOfClass("Humanoid");
	const r6 = humanoid?.RigType === Enum.HumanoidRigType.R6;
	for (const name of r6 ? R6_LIMBS : R15_LIMBS) {
		const limb = character.WaitForChild(name, LIMB_WAIT_SECONDS);
		if (limb?.IsA("BasePart")) burn(limb, powerTier, r6);
	}
}
