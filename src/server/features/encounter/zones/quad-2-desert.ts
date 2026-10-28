import { Workspace } from "@rbxts/services";
import { planDesert, terraceColor } from "./quad-2/desert-plan";
import { SAND } from "./quad-2/desert-props";
import type { PartEffect, PartSpec } from "./quad-2/part-spec";
import type { ZoneBuilder } from "./types";

const FLAME_COLOR = Color3.fromRGB(255, 150, 60);
const DRIFT_COLOR = Color3.fromRGB(236, 200, 140);
/** An engine texture, so the drifting sand needs no uploaded asset. */
const DRIFT_TEXTURE = "rbxasset://textures/particles/smoke_main.dds";

function attachEffect(part: Part, effect: PartEffect): void {
	if (effect === "flame") {
		const fire = new Instance("Fire");
		fire.Size = 3;
		fire.Heat = 6;
		fire.Color = FLAME_COLOR;
		fire.SecondaryColor = Color3.fromRGB(255, 220, 120);
		fire.Parent = part;
		const light = new Instance("PointLight");
		light.Color = FLAME_COLOR;
		light.Brightness = 1.5;
		light.Range = 18;
		light.Shadows = false;
		light.Parent = part;
		return;
	}
	const sand = new Instance("ParticleEmitter");
	sand.Texture = DRIFT_TEXTURE;
	sand.Color = new ColorSequence(DRIFT_COLOR);
	sand.LightEmission = 0;
	sand.Transparency = new NumberSequence([
		new NumberSequenceKeypoint(0, 1),
		new NumberSequenceKeypoint(0.3, 0.75),
		new NumberSequenceKeypoint(1, 1),
	]);
	sand.Size = new NumberSequence([new NumberSequenceKeypoint(0, 3), new NumberSequenceKeypoint(1, 7)]);
	sand.Lifetime = new NumberRange(5, 8);
	sand.Rate = 3;
	sand.Speed = new NumberRange(3, 6);
	sand.SpreadAngle = new Vector2(15, 5);
	sand.EmissionDirection = Enum.NormalId.Right;
	sand.Shape = Enum.ParticleEmitterShape.Box;
	sand.ShapeStyle = Enum.ParticleEmitterShapeStyle.Volume;
	sand.Rotation = new NumberRange(0, 360);
	sand.RotSpeed = new NumberRange(-20, 20);
	sand.Parent = part;
}

function buildPart(parent: Instance, spec: PartSpec): Part {
	const part = new Instance("Part");
	part.Name = spec.name;
	part.Anchored = true;
	if (spec.shape !== undefined) part.Shape = spec.shape;
	part.Size = spec.size;
	part.CFrame = spec.cframe;
	part.Color = spec.color;
	part.Material = spec.material;
	part.CanCollide = spec.collides;
	if (!spec.collides) {
		part.CanTouch = false;
		part.CanQuery = false;
	}
	part.CastShadow = spec.transparency !== 1;
	if (spec.transparency !== undefined) part.Transparency = spec.transparency;
	part.TopSurface = Enum.SurfaceType.Smooth;
	part.BottomSurface = Enum.SurfaceType.Smooth;
	if (spec.effect !== undefined) attachEffect(part, spec.effect);
	part.Parent = parent;
	return part;
}

/**
 * Quad 2's environment: the Desert zone. Sand terraces dressed with
 * sandstone ruins, cacti, palms around an oasis, pots, awnings and bones,
 * with sand drifting across. Placement is the pure plan in
 * quad-2/desert-plan.ts; this only restyles and builds it.
 */
export const buildDesertZone: ZoneBuilder = (context) => {
	context.terraceParts.forEach((terrace, index) => {
		terrace.Material = Enum.Material.Sand;
		terrace.Color = terraceColor(index);
	});
	// Only the dunes are terrain sand, so the material's colour is theirs.
	Workspace.Terrain.SetMaterialColor(Enum.Material.Sand, SAND);

	const props = new Instance("Folder");
	props.Name = "DesertProps";
	for (const spec of planDesert(context.terraces, context.clearZones).parts) {
		if (spec.terrain) Workspace.Terrain.FillBall(spec.cframe.Position, spec.size.X / 2, spec.material);
		else buildPart(props, spec);
	}
	props.Parent = context.folder;
};
