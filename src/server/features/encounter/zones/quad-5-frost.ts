import { planFrost } from "./quad-5/frost-layout";
import type { PartSpec } from "./quad-5/frost-props";
import type { ZoneBuilder } from "./types";

/** Cold whites with a blue tint, a shade apart so neighbouring terraces read as separate steps. */
const FLOOR_COLORS = [Color3.fromRGB(232, 240, 250), Color3.fromRGB(222, 233, 247), Color3.fromRGB(238, 245, 252)];

const SNOWFLAKE = "rbxasset://textures/particles/smoke_main.dds";
const SPARKLE = "rbxasset://textures/particles/sparkles_main.dds";
/** Studs a second the slowest snowflake falls; lifetimes are set from it so every flake lands. */
const SLOWEST_FLAKE = 5;

/** Hangs a spec's light or particles on its part. */
function addEffect(part: Part, effect: PartSpec["effect"], drop: number): void {
	if (effect === "crystalGlow") {
		const light = new Instance("PointLight");
		light.Color = Color3.fromRGB(120, 190, 255);
		light.Brightness = 1.4;
		light.Range = 16;
		light.Parent = part;
		const glints = new Instance("ParticleEmitter");
		glints.Texture = SPARKLE;
		glints.Color = new ColorSequence(Color3.fromRGB(200, 240, 255));
		glints.LightEmission = 1;
		glints.Size = new NumberSequence([
			new NumberSequenceKeypoint(0, 0),
			new NumberSequenceKeypoint(0.5, 0.6),
			new NumberSequenceKeypoint(1, 0),
		]);
		glints.Rate = 1.5;
		glints.Lifetime = new NumberRange(1, 2);
		glints.Speed = new NumberRange(0, 0.3);
		glints.Parent = part;
	} else if (effect === "snowfall") {
		// The sheet spans the terrace; flakes fall from it with a faint crosswind.
		const flakes = new Instance("ParticleEmitter");
		flakes.Texture = SNOWFLAKE;
		flakes.Shape = Enum.ParticleEmitterShape.Box;
		flakes.ShapeStyle = Enum.ParticleEmitterShapeStyle.Volume;
		flakes.EmissionDirection = Enum.NormalId.Bottom;
		flakes.Color = new ColorSequence(new Color3(1, 1, 1));
		flakes.LightEmission = 0.4;
		flakes.Size = new NumberSequence(0.45);
		flakes.Transparency = new NumberSequence([
			new NumberSequenceKeypoint(0, 1),
			new NumberSequenceKeypoint(0.04, 0.1),
			new NumberSequenceKeypoint(0.95, 0.1),
			new NumberSequenceKeypoint(1, 1),
		]);
		// Longer lives than before, so fewer per second keeps the same flakes in the air: snow, not fog.
		flakes.Rate = math.clamp((part.Size.X * part.Size.Z) / 300, 10, 32);
		// Even the slowest flake (SLOWEST_FLAKE studs a second, falling straight) reaches the floor
		// before its life is 95% spent, still opaque: it lands and sinks into the snow.
		flakes.Speed = new NumberRange(SLOWEST_FLAKE, SLOWEST_FLAKE + 1.5);
		const fall = drop / SLOWEST_FLAKE;
		flakes.Lifetime = new NumberRange(fall + 1.5, fall + 2.5);
		flakes.Acceleration = new Vector3(0.1, 0, 0.05);
		flakes.SpreadAngle = new Vector2(8, 8);
		flakes.RotSpeed = new NumberRange(-60, 60);
		flakes.Rotation = new NumberRange(0, 360);
		flakes.Parent = part;
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
	addEffect(part, spec.effect, spec.drop ?? 0);
	part.Parent = parent;
	return part;
}

/**
 * Quad 5's environment: the Frost zone. A glacier and snowfield on snowy
 * terraces: jagged ice spires, glowing crystal clusters, snow-covered pines,
 * frozen boulders, drifts, a frozen pond, icicles down the cliffs and steady
 * snowfall. Where everything goes is planned in quad-5/frost-layout.ts; this
 * only builds it.
 */
export const buildFrostZone: ZoneBuilder = (context) => {
	context.terraceParts.forEach((terrace, index) => {
		terrace.Color = FLOOR_COLORS[index % FLOOR_COLORS.size()];
		terrace.Material = Enum.Material.Snow;
	});

	planFrost(context.terraces, context.clearZones).forEach((entry, index) => {
		const glacier = new Instance("Folder");
		glacier.Name = `Glacier${index + 1}`;
		for (const prop of entry.props) {
			const model = new Instance("Model");
			model.Name = prop.kind;
			for (const spec of prop.parts) buildPart(model, spec);
			model.Parent = glacier;
		}
		glacier.Parent = context.folder;
	});
};
