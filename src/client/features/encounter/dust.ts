import { Debris, Workspace } from "@rbxts/services";

const DUST_TEXTURE = "rbxasset://textures/particles/smoke_main.dds";
const DUST_COLOR = Color3.fromRGB(205, 195, 180);

/**
 * A puff of dust kicked up from the floor at `position`, on this client
 * only: a stomp, a skid, a heavy footfall. `size` scales it with the fighter.
 */
export function puffDust(position: Vector3, size: number, count: number): void {
	const attachment = new Instance("Attachment");
	attachment.WorldPosition = position;
	attachment.Parent = Workspace.Terrain;

	const emitter = new Instance("ParticleEmitter");
	emitter.Texture = DUST_TEXTURE;
	emitter.Color = new ColorSequence(DUST_COLOR);
	emitter.Size = new NumberSequence([
		new NumberSequenceKeypoint(0, 0.8 * size),
		new NumberSequenceKeypoint(1, 2.6 * size),
	]);
	emitter.Transparency = new NumberSequence([new NumberSequenceKeypoint(0, 0.35), new NumberSequenceKeypoint(1, 1)]);
	emitter.Lifetime = new NumberRange(0.5, 0.9);
	emitter.Speed = new NumberRange(4 * size, 9 * size);
	emitter.SpreadAngle = new Vector2(80, 80);
	emitter.Drag = 4;
	emitter.Acceleration = new Vector3(0, 2 * size, 0);
	emitter.RotSpeed = new NumberRange(-90, 90);
	emitter.Rotation = new NumberRange(0, 360);
	emitter.Enabled = false;
	emitter.Parent = attachment;
	emitter.Emit(count);

	Debris.AddItem(attachment, 1.5);
}
