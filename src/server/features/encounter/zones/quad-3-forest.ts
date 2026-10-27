import { planForest } from "./quad-3/forest-layout";
import type { PartSpec } from "./quad-3/forest-props";
import type { ZoneBuilder } from "./types";

/** Dark, cool forest-floor greens, a shade apart so neighbouring terraces read as separate steps. */
const FLOOR_COLORS = [Color3.fromRGB(52, 86, 46), Color3.fromRGB(46, 80, 44), Color3.fromRGB(56, 90, 50)];

const SPARKLE = "rbxasset://textures/particles/sparkles_main.dds";
const SOFT = "rbxasset://textures/particles/smoke_main.dds";

/** Hangs a spec's light or particles on its part. */
function addEffect(part: Part, effect: PartSpec["effect"]): void {
	if (effect === "glow") {
		const light = new Instance("PointLight");
		light.Color = Color3.fromRGB(110, 230, 190);
		light.Brightness = 0.8;
		light.Range = 10;
		light.Parent = part;
	} else if (effect === "sunbeam") {
		const light = new Instance("SpotLight");
		light.Face = Enum.NormalId.Bottom;
		light.Color = Color3.fromRGB(255, 236, 180);
		light.Brightness = 1.2;
		light.Range = 40;
		light.Angle = 35;
		light.Parent = part;
	} else if (effect === "fireflies") {
		const emitter = new Instance("ParticleEmitter");
		emitter.Texture = SPARKLE;
		emitter.Shape = Enum.ParticleEmitterShape.Box;
		emitter.ShapeStyle = Enum.ParticleEmitterShapeStyle.Volume;
		emitter.Color = new ColorSequence(Color3.fromRGB(210, 255, 120));
		emitter.LightEmission = 1;
		emitter.Size = new NumberSequence([
			new NumberSequenceKeypoint(0, 0),
			new NumberSequenceKeypoint(0.5, 0.35),
			new NumberSequenceKeypoint(1, 0),
		]);
		emitter.Rate = 5;
		emitter.Lifetime = new NumberRange(4, 7);
		emitter.Speed = new NumberRange(0.3, 1.2);
		emitter.SpreadAngle = new Vector2(180, 180);
		emitter.Parent = part;
	} else if (effect === "leaves") {
		const emitter = new Instance("ParticleEmitter");
		emitter.Texture = SOFT;
		emitter.Shape = Enum.ParticleEmitterShape.Box;
		emitter.ShapeStyle = Enum.ParticleEmitterShapeStyle.Volume;
		emitter.Color = new ColorSequence(Color3.fromRGB(96, 140, 60), Color3.fromRGB(150, 120, 60));
		emitter.LightEmission = 0;
		emitter.Size = new NumberSequence(0.5);
		// Fade in and out, and stay a little see-through, so leaves drift rather than pop.
		emitter.Transparency = new NumberSequence([
			new NumberSequenceKeypoint(0, 1),
			new NumberSequenceKeypoint(0.15, 0.35),
			new NumberSequenceKeypoint(0.85, 0.35),
			new NumberSequenceKeypoint(1, 1),
		]);
		emitter.Squash = new NumberSequence(0.6);
		emitter.Rate = 1.5;
		emitter.Lifetime = new NumberRange(6, 9);
		emitter.Speed = new NumberRange(0.5, 1);
		// Drag caps the fall at about 3 studs a second: leaves flutter down rather than drop.
		emitter.Acceleration = new Vector3(0.8, -3, 0.4);
		emitter.Drag = 1;
		emitter.RotSpeed = new NumberRange(-90, 90);
		emitter.Rotation = new NumberRange(0, 360);
		emitter.Parent = part;
	}
}

function buildPart(parent: Instance, spec: PartSpec): Part {
	const part = new Instance("Part");
	part.Name = spec.name;
	part.Anchored = true;
	part.Shape = spec.shape;
	part.Size = spec.size;
	part.CFrame = spec.cframe;
	part.Color = spec.color;
	part.Material = spec.material;
	part.Transparency = spec.transparency;
	part.CastShadow = spec.castShadow;
	part.CanCollide = spec.collide;
	if (!spec.collide) {
		part.CanTouch = false;
		part.CanQuery = false;
	}
	part.TopSurface = Enum.SurfaceType.Smooth;
	part.BottomSurface = Enum.SurfaceType.Smooth;
	addEffect(part, spec.effect);
	part.Parent = parent;
	return part;
}

/**
 * Quad 3's environment: the Forest zone. Deep, mossy woodland on dark green
 * terraces: tall layered trees, fallen logs, mossy boulders, mushrooms (some
 * glowing), ferns, shafts of dappled light and fireflies. Where everything
 * goes is planned in quad-3/forest-layout.ts; this only builds it.
 */
export const buildForestZone: ZoneBuilder = (context) => {
	context.terraceParts.forEach((terrace, index) => {
		terrace.Color = FLOOR_COLORS[index % FLOOR_COLORS.size()];
		terrace.Material = Enum.Material.LeafyGrass;
	});

	planForest(context.terraces, context.clearZones).forEach((entry, index) => {
		const woods = new Instance("Folder");
		woods.Name = `Woods${index + 1}`;
		for (const prop of entry.props) {
			const model = new Instance("Model");
			model.Name = prop.kind;
			for (const spec of prop.parts) buildPart(model, spec);
			model.Parent = woods;
		}
		woods.Parent = context.folder;
	});
};
