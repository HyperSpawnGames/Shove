import type { PropEmitter, PropSpec } from "./plan";

/** Engine textures only: no uploaded asset ids. */
const MIST_TEXTURE = "rbxasset://textures/particles/smoke_main.dds";
const SPARK_TEXTURE = "rbxasset://textures/particles/sparkles_main.dds";

function emitter(parent: BasePart, kind: PropEmitter): void {
	const particles = new Instance("ParticleEmitter");
	particles.Name = kind === "mist" ? "VoidMist" : "VoidSparks";
	if (kind === "mist") {
		const size = math.clamp(math.max(parent.Size.X, parent.Size.Z) * 0.4, 3, 10);
		particles.Texture = MIST_TEXTURE;
		particles.Color = new ColorSequence(Color3.fromRGB(70, 30, 100), Color3.fromRGB(20, 8, 30));
		particles.Size = new NumberSequence(size * 0.6, size);
		particles.Transparency = new NumberSequence([
			new NumberSequenceKeypoint(0, 1),
			new NumberSequenceKeypoint(0.3, 0.7),
			new NumberSequenceKeypoint(1, 1),
		]);
		particles.Lifetime = new NumberRange(6, 10);
		particles.Rate = 2;
		particles.Speed = new NumberRange(0.3, 1);
		particles.SpreadAngle = new Vector2(180, 180);
		particles.Acceleration = new Vector3(0, 0.15, 0);
		particles.Rotation = new NumberRange(0, 360);
		particles.RotSpeed = new NumberRange(-8, 8);
		particles.LightInfluence = 0.6;
	} else {
		particles.Texture = SPARK_TEXTURE;
		particles.Color = new ColorSequence(Color3.fromRGB(255, 80, 220), Color3.fromRGB(150, 60, 255));
		particles.Size = new NumberSequence(0.7, 0);
		particles.Lifetime = new NumberRange(1.5, 3);
		particles.Rate = 6;
		particles.Speed = new NumberRange(1.5, 4);
		particles.SpreadAngle = new Vector2(180, 180);
		particles.Acceleration = new Vector3(0, 1.5, 0);
		particles.LightEmission = 1;
		particles.LightInfluence = 0;
	}
	particles.Parent = parent;
}

/** Builds the planned parts: anchored, never touched or queried unless they collide. */
export function buildProps(folder: Folder, props: readonly PropSpec[]): void {
	const terraceFolders = new Map<number, Folder>();
	for (const prop of props) {
		let parent = terraceFolders.get(prop.terrace);
		if (parent === undefined) {
			parent = new Instance("Folder");
			parent.Name = `Terrace${prop.terrace + 1}`;
			parent.Parent = folder;
			terraceFolders.set(prop.terrace, parent);
		}
		const part = new Instance("Part");
		part.Name = prop.name;
		part.Shape = prop.shape === "cylinder" ? Enum.PartType.Cylinder : Enum.PartType.Block;
		part.Anchored = true;
		part.Size = prop.size;
		part.CFrame = prop.cframe;
		part.Color = prop.color;
		part.Material = prop.material;
		part.Transparency = prop.transparency;
		part.CanCollide = prop.collidable;
		part.CanTouch = false;
		part.CanQuery = prop.collidable;
		part.CastShadow = prop.castShadow;
		part.TopSurface = Enum.SurfaceType.Smooth;
		part.BottomSurface = Enum.SurfaceType.Smooth;
		if (prop.light) {
			const light = new Instance("PointLight");
			light.Color = prop.light.color;
			light.Range = prop.light.range;
			light.Brightness = prop.light.brightness;
			light.Shadows = false;
			light.Parent = part;
		}
		if (prop.emitter) emitter(part, prop.emitter);
		part.Parent = parent;
	}
}
