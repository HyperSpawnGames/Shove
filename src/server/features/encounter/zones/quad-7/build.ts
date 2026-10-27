import type { Piece, PieceEffect } from "./pieces";

const TERRACE_COLOR = Color3.fromRGB(44, 39, 38);
const LIGHT_COLOR = Color3.fromRGB(255, 120, 45);

/** Black basalt for the zone's raised terraces. */
export function restyleTerraces(parts: readonly BasePart[]): void {
	for (const terrace of parts) {
		terrace.Color = TERRACE_COLOR;
		terrace.Material = Enum.Material.Basalt;
	}
}

function emitter(parent: BasePart, effect: PieceEffect): void {
	const particles = new Instance("ParticleEmitter");
	if (effect === "smoke") {
		particles.Texture = "rbxasset://textures/particles/smoke_main.dds";
		particles.Color = new ColorSequence(Color3.fromRGB(70, 62, 60), Color3.fromRGB(35, 32, 32));
		particles.Size = new NumberSequence([new NumberSequenceKeypoint(0, 2), new NumberSequenceKeypoint(1, 9)]);
		particles.Transparency = new NumberSequence([new NumberSequenceKeypoint(0, 0.5), new NumberSequenceKeypoint(1, 1)]);
		particles.Lifetime = new NumberRange(4, 7);
		particles.Rate = 3;
		particles.Speed = new NumberRange(3, 6);
		particles.SpreadAngle = new Vector2(12, 12);
		particles.Acceleration = new Vector3(0.6, 0.8, 0);
		particles.RotSpeed = new NumberRange(-20, 20);
		particles.Rotation = new NumberRange(0, 360);
	} else {
		particles.Texture = "rbxasset://textures/particles/sparkles_main.dds";
		particles.Color = new ColorSequence(Color3.fromRGB(255, 200, 80), Color3.fromRGB(255, 70, 20));
		particles.LightEmission = 1;
		particles.Size = new NumberSequence([new NumberSequenceKeypoint(0, 0.5), new NumberSequenceKeypoint(1, 0)]);
		particles.Lifetime = new NumberRange(2, 4);
		particles.Rate = 6;
		particles.Speed = new NumberRange(4, 9);
		particles.SpreadAngle = new Vector2(35, 35);
		particles.Acceleration = new Vector3(0, -2, 0);
	}
	// Emit from the piece's top face, whichever way a cylinder lies.
	particles.EmissionDirection =
		parent.IsA("Part") && parent.Shape === Enum.PartType.Cylinder ? Enum.NormalId.Right : Enum.NormalId.Top;
	particles.Parent = parent;
}

/** Makes each planned piece an anchored part in `folder`, with its light and particles. */
export function buildPieces(folder: Instance, pieces: readonly Piece[]): void {
	for (const piece of pieces) {
		let instance: BasePart;
		if (piece.shape === "wedge") {
			instance = new Instance("WedgePart");
		} else {
			const block = new Instance("Part");
			block.Shape = piece.shape === "cylinder" ? Enum.PartType.Cylinder : Enum.PartType.Block;
			instance = block;
		}
		instance.Name = piece.name;
		instance.Anchored = true;
		instance.Size = piece.size;
		instance.CFrame = piece.cframe;
		instance.Color = piece.color;
		instance.Material = piece.material;
		instance.TopSurface = Enum.SurfaceType.Smooth;
		instance.BottomSurface = Enum.SurfaceType.Smooth;
		instance.CanCollide = piece.collide;
		if (!piece.collide) {
			instance.CanTouch = false;
			instance.CanQuery = false;
			instance.CastShadow = false;
		}
		if (piece.lightRange !== undefined) {
			const light = new Instance("PointLight");
			light.Color = LIGHT_COLOR;
			light.Range = piece.lightRange;
			light.Brightness = 2;
			light.Parent = instance;
		}
		if (piece.effect !== undefined) emitter(instance, piece.effect);
		instance.Parent = folder;
	}
}
