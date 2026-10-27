import type { PropExtra, PropSpec } from "./arena-plan";
import { NEON } from "./arena-plan";

const CONFETTI_TEXTURE = "rbxasset://textures/particles/sparkles_main.dds";
const SPARKS_TEXTURE = "rbxasset://textures/particles/fire_sparks_main.dds";

function confetti(parent: BasePart): void {
	const emitter = new Instance("ParticleEmitter");
	emitter.Name = "Confetti";
	emitter.Texture = CONFETTI_TEXTURE;
	emitter.Color = new ColorSequence([
		new ColorSequenceKeypoint(0, NEON.cyan),
		new ColorSequenceKeypoint(0.5, NEON.magenta),
		new ColorSequenceKeypoint(1, NEON.gold),
	]);
	emitter.Size = new NumberSequence(1.4);
	emitter.Lifetime = new NumberRange(6, 9);
	emitter.Rate = 10;
	emitter.Speed = new NumberRange(2, 6);
	emitter.EmissionDirection = Enum.NormalId.Bottom;
	emitter.SpreadAngle = new Vector2(35, 35);
	emitter.Acceleration = new Vector3(0, -5, 0);
	emitter.Drag = 0.4;
	emitter.Rotation = new NumberRange(0, 360);
	emitter.RotSpeed = new NumberRange(-200, 200);
	emitter.LightEmission = 0.6;
	emitter.Parent = parent;
}

function sparks(parent: BasePart, color: Color3): void {
	const emitter = new Instance("ParticleEmitter");
	emitter.Name = "Sparks";
	emitter.Texture = SPARKS_TEXTURE;
	emitter.Color = new ColorSequence(color, NEON.white);
	emitter.Size = new NumberSequence(0.6, 0);
	emitter.Lifetime = new NumberRange(0.6, 1.2);
	emitter.Rate = 12;
	emitter.Speed = new NumberRange(6, 12);
	emitter.EmissionDirection = Enum.NormalId.Front;
	emitter.SpreadAngle = new Vector2(40, 40);
	emitter.Acceleration = new Vector3(0, -30, 0);
	emitter.LightEmission = 1;
	emitter.Parent = parent;
}

function spotlight(parent: BasePart, extra: Extract<PropExtra, { kind: "spotlight" }>): void {
	const light = new Instance("SpotLight");
	light.Face = Enum.NormalId.Front;
	light.Brightness = extra.brightness;
	light.Range = extra.range;
	light.Angle = extra.angle;
	light.Color = extra.color;
	light.Shadows = false;
	light.Parent = parent;
}

/** The text on the banner's spawn-facing side. */
function title(parent: BasePart, extra: Extract<PropExtra, { kind: "title" }>): void {
	const gui = new Instance("SurfaceGui");
	gui.Face = Enum.NormalId.Back;
	gui.LightInfluence = 0;
	gui.Brightness = 2;
	gui.CanvasSize = new Vector2(1000, 220);
	gui.Parent = parent;
	const text = new Instance("TextLabel");
	text.Size = new UDim2(0.92, 0, 0.6, 0);
	text.Position = UDim2.fromScale(0.04, 0.06);
	text.BackgroundTransparency = 1;
	text.Font = Enum.Font.GothamBlack;
	text.TextScaled = true;
	text.TextColor3 = extra.color;
	text.TextStrokeColor3 = NEON.magenta;
	text.TextStrokeTransparency = 0.3;
	text.Text = extra.text;
	text.Parent = gui;
}

/** Builds one planned prop into `parent`, anchored; decoration neither collides nor blocks the camera. */
export function buildProp(parent: Instance, spec: PropSpec): BasePart {
	const instance = new Instance("Part");
	instance.Name = spec.name;
	instance.Anchored = true;
	if (spec.shape === "Cylinder") instance.Shape = Enum.PartType.Cylinder;
	instance.Size = spec.size;
	instance.CFrame = spec.cframe;
	instance.Color = spec.color;
	instance.Material = spec.material;
	instance.Transparency = spec.transparency;
	instance.TopSurface = Enum.SurfaceType.Smooth;
	instance.BottomSurface = Enum.SurfaceType.Smooth;
	instance.CanCollide = spec.collidable;
	instance.CanTouch = spec.collidable;
	instance.CanQuery = spec.collidable;
	instance.CastShadow = spec.collidable;
	if (spec.material === Enum.Material.Metal || spec.material === Enum.Material.SmoothPlastic)
		instance.Reflectance = 0.08;

	const extra = spec.extra;
	if (extra?.kind === "spotlight") spotlight(instance, extra);
	else if (extra?.kind === "confetti") confetti(instance);
	else if (extra?.kind === "sparks") sparks(instance, extra.color);
	else if (extra?.kind === "title") title(instance, extra);

	instance.Parent = parent;
	return instance;
}
