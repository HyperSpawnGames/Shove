import { Workspace } from "@rbxts/services";
import { boltPoints } from "./lightning";

/** Engine particle textures, so no effect needs an uploaded asset. */
const TEXTURE = {
	fire: "rbxasset://textures/particles/fire_main.dds",
	sparks: "rbxasset://textures/particles/fire_sparks_main.dds",
	smoke: "rbxasset://textures/particles/smoke_main.dds",
	sparkles: "rbxasset://textures/particles/sparkles_main.dds",
	glow: "rbxasset://textures/particles/forcefield_glow_main.dds",
	vortex: "rbxasset://textures/particles/forcefield_vortex_main.dds",
	implosion: "rbxasset://textures/particles/explosion01_implosion_main.dds",
};

/** Where a power burns: both hands and both feet (R15 parts, then R6 limbs). */
export const R15_LIMBS = ["RightHand", "LeftHand", "RightFoot", "LeftFoot"];
export const R6_LIMBS = ["Right Arm", "Left Arm", "Right Leg", "Left Leg"];

/** One particle layer, emitted at every hand and foot. */
interface Layer {
	texture: string;
	/** Colours over a particle's life, evenly spaced. */
	colors: Color3[];
	/** Sizes over a particle's life, evenly spaced. */
	sizes: number[];
	/** Transparency at birth and at death. */
	fade: [number, number];
	lifetime: [number, number];
	rate: number;
	speed: [number, number];
	/** World acceleration: up for flame and smoke, down for drips and falling sparks. */
	acceleration?: Vector3;
	drag?: number;
	/** 1 glows, 0 takes the scene's light (dark smoke stays dark with lightInfluence 0). */
	lightEmission?: number;
	lightInfluence?: number;
	spin?: [number, number];
	/** Streaks drawn along their motion, for sparks. */
	streaks?: boolean;
	/** Moves with the limb instead of trailing behind: a glow that clings to the hand. */
	locked?: boolean;
	zOffset?: number;
}

/** Lightning: short jagged bolts that crackle out of each hand and foot. */
interface Arcs {
	color: Color3;
	/** Bolts per second from each limb. */
	rate: number;
	reach: [number, number];
	segments: number;
	jitter: number;
	thickness: number;
	/** Seconds a bolt stays lit. */
	life: number;
}

interface Recipe {
	layers: Layer[];
	light: { color: Color3; brightness: number; range: number; /** 0 steady, 1 strobing. */ flicker: number };
	arcs?: Arcs;
}

const rgb = Color3.fromRGB;

/** Each power drawn as what it is named: Ember burns, Storm crackles with lightning, Frost breathes cold. */
const RECIPES: { [id: string]: Recipe } = {
	Spark: {
		layers: [
			{
				texture: TEXTURE.glow,
				colors: [rgb(255, 255, 220), rgb(255, 220, 90)],
				sizes: [2.2, 1],
				fade: [0.1, 1],
				lifetime: [0.12, 0.22],
				rate: 30,
				speed: [0, 0],
				lightEmission: 1,
				locked: true,
			},
			{
				texture: TEXTURE.sparks,
				colors: [rgb(255, 250, 200), rgb(255, 170, 40)],
				sizes: [0.6, 0],
				fade: [0, 1],
				lifetime: [0.3, 0.6],
				rate: 60,
				speed: [5, 10],
				acceleration: new Vector3(0, -30, 0),
				drag: 1,
				lightEmission: 1,
				streaks: true,
			},
			{
				texture: TEXTURE.sparkles,
				colors: [rgb(255, 245, 170)],
				sizes: [0.9, 0],
				fade: [0, 1],
				lifetime: [0.4, 0.8],
				rate: 18,
				speed: [1, 2.5],
				lightEmission: 1,
				spin: [-180, 180],
			},
		],
		light: { color: rgb(255, 225, 130), brightness: 3, range: 10, flicker: 0.6 },
		arcs: {
			color: rgb(255, 240, 160),
			rate: 6,
			reach: [1, 1.9],
			segments: 4,
			jitter: 0.3,
			thickness: 0.07,
			life: 0.06,
		},
	},
	Ember: {
		layers: [
			{
				texture: TEXTURE.fire,
				colors: [rgb(255, 240, 150), rgb(255, 130, 30), rgb(190, 30, 10)],
				sizes: [0.9, 1.7, 0.3],
				fade: [0.05, 1],
				lifetime: [0.5, 0.9],
				rate: 70,
				speed: [0.5, 1.5],
				acceleration: new Vector3(0, 10, 0),
				drag: 1.5,
				lightEmission: 1,
				spin: [-80, 80],
			},
			{
				texture: TEXTURE.sparks,
				colors: [rgb(255, 210, 90), rgb(255, 90, 20)],
				sizes: [0.2, 0],
				fade: [0, 1],
				lifetime: [0.8, 1.5],
				rate: 22,
				speed: [1, 3],
				acceleration: new Vector3(0, 7, 0),
				drag: 0.5,
				lightEmission: 1,
				streaks: true,
			},
			{
				texture: TEXTURE.smoke,
				colors: [rgb(70, 45, 30), rgb(40, 35, 35)],
				sizes: [0.8, 2.6],
				fade: [0.55, 1],
				lifetime: [1, 1.7],
				rate: 10,
				speed: [0.5, 1],
				acceleration: new Vector3(0, 5, 0),
				lightEmission: 0,
				spin: [-40, 40],
				zOffset: -1,
			},
		],
		light: { color: rgb(255, 140, 40), brightness: 3.5, range: 11, flicker: 0.55 },
	},
	Frost: {
		layers: [
			{
				texture: TEXTURE.smoke,
				colors: [rgb(230, 245, 255), rgb(170, 215, 255)],
				sizes: [0.7, 2.6],
				fade: [0.45, 1],
				lifetime: [1.2, 2],
				rate: 18,
				speed: [0.3, 0.8],
				acceleration: new Vector3(0, -2, 0),
				lightEmission: 0.4,
				spin: [-30, 30],
			},
			{
				texture: TEXTURE.sparkles,
				colors: [rgb(200, 240, 255), rgb(255, 255, 255)],
				sizes: [0.55, 0],
				fade: [0, 1],
				lifetime: [0.6, 1.1],
				rate: 24,
				speed: [1.5, 3],
				drag: 2,
				lightEmission: 1,
				spin: [-240, 240],
			},
			{
				texture: TEXTURE.glow,
				colors: [rgb(255, 255, 255)],
				sizes: [0.18, 0.12],
				fade: [0, 1],
				lifetime: [1.5, 2.5],
				rate: 12,
				speed: [0.5, 1],
				acceleration: new Vector3(0, -3, 0),
				lightEmission: 1,
			},
			{
				texture: TEXTURE.glow,
				colors: [rgb(120, 210, 255)],
				sizes: [1.3, 0.9],
				fade: [0.45, 1],
				lifetime: [0.3, 0.45],
				rate: 12,
				speed: [0, 0],
				lightEmission: 1,
				locked: true,
			},
		],
		light: { color: rgb(150, 220, 255), brightness: 2, range: 9, flicker: 0.08 },
	},
	Storm: {
		layers: [
			{
				texture: TEXTURE.glow,
				colors: [rgb(230, 240, 255), rgb(110, 150, 255)],
				sizes: [1.6, 0.6],
				fade: [0.15, 1],
				lifetime: [0.06, 0.16],
				rate: 35,
				speed: [0, 0],
				lightEmission: 1,
				locked: true,
			},
			{
				texture: TEXTURE.sparks,
				colors: [rgb(235, 245, 255), rgb(120, 150, 255)],
				sizes: [0.25, 0],
				fade: [0, 1],
				lifetime: [0.1, 0.25],
				rate: 30,
				speed: [9, 15],
				drag: 2,
				lightEmission: 1,
				streaks: true,
			},
		],
		light: { color: rgb(150, 175, 255), brightness: 5, range: 12, flicker: 1 },
		arcs: {
			color: rgb(190, 215, 255),
			rate: 12,
			reach: [1.4, 2.8],
			segments: 6,
			jitter: 0.45,
			thickness: 0.09,
			life: 0.08,
		},
	},
	Venom: {
		layers: [
			{
				texture: TEXTURE.smoke,
				colors: [rgb(140, 255, 70), rgb(40, 110, 20)],
				sizes: [0.6, 2.2],
				fade: [0.35, 1],
				lifetime: [1, 1.6],
				rate: 22,
				speed: [0.5, 1.2],
				acceleration: new Vector3(0, 2.5, 0),
				lightEmission: 0.5,
				spin: [-60, 60],
			},
			{
				texture: TEXTURE.glow,
				colors: [rgb(190, 255, 110)],
				sizes: [0.15, 0.45, 0],
				fade: [0.1, 0.5],
				lifetime: [0.6, 1.2],
				rate: 16,
				speed: [0.5, 1.5],
				acceleration: new Vector3(0, 3, 0),
				lightEmission: 1,
			},
			{
				texture: TEXTURE.sparks,
				colors: [rgb(160, 255, 80), rgb(60, 170, 20)],
				sizes: [0.25, 0.12],
				fade: [0, 0.6],
				lifetime: [0.5, 0.9],
				rate: 9,
				speed: [0.3, 1],
				acceleration: new Vector3(0, -22, 0),
				lightEmission: 1,
				streaks: true,
			},
		],
		light: { color: rgb(110, 255, 60), brightness: 2, range: 9, flicker: 0.2 },
	},
	Shadow: {
		layers: [
			{
				texture: TEXTURE.smoke,
				colors: [rgb(15, 0, 25), rgb(55, 15, 85)],
				sizes: [0.8, 2.4],
				fade: [0.15, 1],
				lifetime: [0.8, 1.4],
				rate: 34,
				speed: [1, 2],
				acceleration: new Vector3(0, 3.5, 0),
				lightEmission: 0,
				lightInfluence: 0,
				spin: [-140, 140],
			},
			{
				texture: TEXTURE.vortex,
				colors: [rgb(150, 70, 230), rgb(60, 10, 110)],
				sizes: [1.5, 0.4],
				fade: [0.35, 1],
				lifetime: [0.4, 0.7],
				rate: 10,
				speed: [0, 0],
				lightEmission: 0.7,
				spin: [220, 320],
				locked: true,
			},
			{
				texture: TEXTURE.sparkles,
				colors: [rgb(190, 110, 255)],
				sizes: [0.35, 0],
				fade: [0, 1],
				lifetime: [0.5, 0.9],
				rate: 10,
				speed: [1, 2],
				acceleration: new Vector3(0, 2, 0),
				lightEmission: 1,
			},
		],
		light: { color: rgb(130, 50, 210), brightness: 1.5, range: 8, flicker: 0.3 },
	},
	Cosmic: {
		layers: [
			{
				texture: TEXTURE.vortex,
				colors: [rgb(255, 90, 255), rgb(90, 160, 255)],
				sizes: [1.9, 1.2],
				fade: [0.35, 1],
				lifetime: [0.6, 1],
				rate: 9,
				speed: [0, 0],
				lightEmission: 1,
				spin: [90, 180],
				locked: true,
			},
			{
				texture: TEXTURE.sparkles,
				colors: [rgb(255, 120, 230), rgb(120, 220, 255), rgb(255, 240, 140)],
				sizes: [0.6, 0],
				fade: [0, 1],
				lifetime: [0.7, 1.3],
				rate: 34,
				speed: [1.5, 3.5],
				drag: 2,
				lightEmission: 1,
				spin: [-200, 200],
			},
			{
				texture: TEXTURE.glow,
				colors: [rgb(255, 255, 255), rgb(200, 150, 255)],
				sizes: [0.35, 0],
				fade: [0, 1],
				lifetime: [0.2, 0.4],
				rate: 22,
				speed: [3, 6],
				lightEmission: 1,
				streaks: true,
			},
		],
		light: { color: rgb(255, 100, 255), brightness: 2.5, range: 10, flicker: 0.25 },
	},
	Void: {
		layers: [
			{
				texture: TEXTURE.implosion,
				colors: [rgb(170, 80, 255), rgb(60, 0, 120)],
				sizes: [2.4, 0],
				fade: [0.15, 1],
				lifetime: [0.4, 0.6],
				rate: 9,
				speed: [0, 0],
				lightEmission: 1,
				spin: [-200, 200],
				locked: true,
			},
			{
				texture: TEXTURE.smoke,
				colors: [rgb(5, 0, 12), rgb(30, 0, 50)],
				sizes: [1.4, 0.2],
				fade: [0.2, 1],
				lifetime: [0.6, 1],
				rate: 24,
				speed: [0.3, 0.8],
				lightEmission: 0,
				lightInfluence: 0,
				spin: [-160, 160],
				zOffset: -1,
			},
			{
				texture: TEXTURE.sparkles,
				colors: [rgb(200, 130, 255), rgb(120, 40, 255)],
				sizes: [0.45, 0],
				fade: [0, 1],
				lifetime: [0.5, 0.9],
				rate: 20,
				speed: [2, 4],
				drag: 4,
				lightEmission: 1,
			},
		],
		light: { color: rgb(150, 60, 255), brightness: 3, range: 11, flicker: 0.5 },
		arcs: {
			color: rgb(180, 90, 255),
			rate: 5,
			reach: [1.2, 2.4],
			segments: 5,
			jitter: 0.4,
			thickness: 0.08,
			life: 0.09,
		},
	},
};

function sequence(values: number[]): NumberSequence {
	if (values.size() === 1) return new NumberSequence(values[0]);
	return new NumberSequence(values.map((value, i) => new NumberSequenceKeypoint(i / (values.size() - 1), value)));
}

function colorSequence(colors: Color3[]): ColorSequence {
	if (colors.size() === 1) return new ColorSequence(colors[0]);
	return new ColorSequence(colors.map((color, i) => new ColorSequenceKeypoint(i / (colors.size() - 1), color)));
}

function emitter(layer: Layer): ParticleEmitter {
	const particles = new Instance("ParticleEmitter");
	particles.Texture = layer.texture;
	particles.Color = colorSequence(layer.colors);
	particles.Size = sequence(layer.sizes);
	particles.Transparency = sequence(layer.fade);
	particles.Lifetime = new NumberRange(layer.lifetime[0], layer.lifetime[1]);
	particles.Rate = layer.rate;
	particles.Speed = new NumberRange(layer.speed[0], layer.speed[1]);
	particles.SpreadAngle = new Vector2(180, 180);
	particles.Acceleration = layer.acceleration ?? Vector3.zero;
	particles.Drag = layer.drag ?? 0;
	particles.LightEmission = layer.lightEmission ?? 1;
	particles.LightInfluence = layer.lightInfluence ?? 0;
	particles.Rotation = new NumberRange(0, 360);
	if (layer.spin) particles.RotSpeed = new NumberRange(layer.spin[0], layer.spin[1]);
	if (layer.streaks) particles.Orientation = Enum.ParticleOrientation.VelocityParallel;
	particles.LockedToPart = layer.locked ?? false;
	particles.ZOffset = layer.zOffset ?? 0;
	return particles;
}

/** A body's limbs that carry the power, in its rig's names; missing ones are skipped. */
function limbsOf(character: Model): { part: BasePart; r6: boolean }[] {
	const r6 = character.FindFirstChildOfClass("Humanoid")?.RigType === Enum.HumanoidRigType.R6;
	const limbs: { part: BasePart; r6: boolean }[] = [];
	for (const name of r6 ? R6_LIMBS : R15_LIMBS) {
		const part = character.FindFirstChild(name);
		if (part?.IsA("BasePart")) limbs.push({ part, r6 });
	}
	return limbs;
}

/** A bolt's segments, kept and re-aimed for every strike rather than made anew. */
interface Bolt {
	segments: Part[];
	litUntil: number;
}

function boltSegment(color: Color3, thickness: number, parent: Instance): Part {
	const segment = new Instance("Part");
	segment.Anchored = true;
	segment.CanCollide = false;
	segment.CanQuery = false;
	segment.CanTouch = false;
	segment.CastShadow = false;
	segment.Material = Enum.Material.Neon;
	segment.Color = color;
	segment.Size = new Vector3(thickness, thickness, 1);
	segment.Transparency = 1;
	segment.Parent = parent;
	return segment;
}

export interface PowerEffect {
	/** Advances the animated parts: the light's flicker and the lightning. */
	step(dt: number): void;
	destroy(): void;
}

/**
 * Draws `powerId` on a body, on this client only: the recipe's particle layers
 * at both hands and both feet, a light on the chest, and lightning for the
 * powers that crackle. Undefined for an id with no recipe.
 */
export function attachPower(character: Model, powerId: string): PowerEffect | undefined {
	const recipe = RECIPES[powerId];
	if (recipe === undefined) return undefined;

	const owned: Instance[] = [];
	const anchors: Attachment[] = [];
	for (const { part, r6 } of limbsOf(character)) {
		const anchor = new Instance("Attachment");
		anchor.Name = "PowerEffect";
		// An R6 limb is a whole arm or leg; the power sits at its hand or foot end.
		if (r6) anchor.Position = new Vector3(0, -part.Size.Y / 2, 0);
		for (const layer of recipe.layers) emitter(layer).Parent = anchor;
		anchor.Parent = part;
		owned.push(anchor);
		anchors.push(anchor);
	}

	const chest = character.FindFirstChild("UpperTorso") ?? character.FindFirstChild("Torso") ?? character.PrimaryPart;
	const light = new Instance("PointLight");
	light.Color = recipe.light.color;
	light.Brightness = recipe.light.brightness;
	light.Range = recipe.light.range;
	light.Shadows = false;
	light.Parent = chest;
	owned.push(light);

	const arcs = recipe.arcs;
	const bolts: Bolt[] = [];
	let boltFolder: Folder | undefined;
	if (arcs !== undefined) {
		boltFolder = new Instance("Folder");
		boltFolder.Name = `PowerLightning_${character.Name}`;
		boltFolder.Parent = Workspace;
		owned.push(boltFolder);
		// Enough bolts that every limb can have two lit at once.
		for (let i = 0; i < anchors.size() * 2; i++) {
			const segments: Part[] = [];
			for (let s = 0; s < arcs.segments; s++) segments.push(boltSegment(arcs.color, arcs.thickness, boltFolder));
			bolts.push({ segments, litUntil: 0 });
		}
	}

	const rng = new Random();
	let flickerTimer = 0;
	let clock = 0;

	const strike = (from: Vector3) => {
		if (arcs === undefined) return;
		const bolt = bolts.find((candidate) => candidate.litUntil <= clock);
		if (bolt === undefined) return;
		const direction = rng.NextUnitVector();
		const to = from.add(direction.mul(rng.NextNumber(arcs.reach[0], arcs.reach[1])));
		const points = boltPoints(from, to, arcs.segments, arcs.jitter, rng);
		bolt.segments.forEach((segment, i) => {
			const a = points[i];
			const b = points[i + 1];
			const length = b.sub(a).Magnitude;
			segment.Size = new Vector3(arcs.thickness, arcs.thickness, math.max(length, 0.05));
			segment.CFrame = CFrame.lookAt(a.add(b).div(2), b);
			segment.Transparency = 0;
		});
		bolt.litUntil = clock + arcs.life;
	};

	return {
		step(dt) {
			clock += dt;
			flickerTimer -= dt;
			if (flickerTimer <= 0) {
				flickerTimer = 0.05;
				light.Brightness = recipe.light.brightness * (1 - recipe.light.flicker * rng.NextNumber());
			}
			if (arcs === undefined) return;
			for (const bolt of bolts) {
				if (bolt.litUntil <= clock) for (const segment of bolt.segments) segment.Transparency = 1;
			}
			for (const anchor of anchors) {
				if (anchor.Parent !== undefined && rng.NextNumber() < arcs.rate * dt) strike(anchor.WorldPosition);
			}
		},
		destroy() {
			for (const instance of owned) instance.Destroy();
		},
	};
}
