import { Controller, OnStart } from "@flamework/core";
import { CollectionService, RunService, Workspace } from "@rbxts/services";
import { ANIMATION_SCALE_ATTRIBUTE, SCALED_GIANT_TAG } from "shared/features/encounter/giant-scale";
import { correctedTransform, probeVerdict, shouldApplyFixup, translationRatio } from "./animation-scale";

/**
 * "probe" measures the engine once and corrects only if it still
 * double-scales; "always" and "never" skip the probe, for debugging.
 */
const FIXUP_MODE: "probe" | "always" | "never" = "probe";
/** The scale the probe compares against 1x: far enough that k and k² never blur. */
const PROBE_SCALE = 4;
/** Roblox's default R15 idle, the track the server plays on every giant. */
const PROBE_ANIMATION = "rbxassetid://507766666";
/** Where the probe freezes the idle: a pose with clear joint translation. */
const PROBE_FREEZE_AT = 0.9;
/** Seconds to wait for the idle to load before giving up on the probe. */
const PROBE_LOAD_SECONDS = 10;
/** Seconds the frozen pose is held before reading it, so the Animator has written it. */
const PROBE_SETTLE_SECONDS = 0.5;
/** The joints of an R15 body; a rig with fewer has not finished streaming in. */
const R15_JOINT_COUNT = 15;

type AnimatedJoint = Motor6D | AnimationConstraint;

interface ScaledGiant {
	scale: number;
	/**
	 * Each joint and the Transform last written to it, to tell an Animator write
	 * from our own; false until the first write. Never undefined: in Luau a nil
	 * value deletes the key, which would leave the table empty.
	 */
	joints: Map<AnimatedJoint, CFrame | false>;
	connections: RBXScriptConnection[];
}

function isAnimatedJoint(instance: Instance): instance is AnimatedJoint {
	return instance.IsA("Motor6D") || instance.IsA("AnimationConstraint");
}

/** Whether a joint has both its ends, so it is a whole joint and not a half-streamed one. */
function isConnected(joint: AnimatedJoint): boolean {
	if (joint.IsA("Motor6D")) return joint.Part0 !== undefined && joint.Part1 !== undefined;
	return joint.Attachment0 !== undefined && joint.Attachment1 !== undefined;
}

/**
 * A hidden, inert copy of `source` at `scale`: no tags (so neither this nor
 * any other controller picks it up), no accessories, prompts or labels, and
 * nothing visible, collidable or queryable.
 */
function probeRig(source: Model, scale: number, parent: Instance): Model | undefined {
	const rig = source.Clone();
	if (rig === undefined) return undefined;
	for (const tag of rig.GetTags()) rig.RemoveTag(tag);
	for (const descendant of rig.GetDescendants()) {
		for (const tag of descendant.GetTags()) descendant.RemoveTag(tag);
		if (
			descendant.IsA("Accessory") ||
			descendant.IsA("ProximityPrompt") ||
			descendant.IsA("LayerCollector") ||
			descendant.IsA("LuaSourceContainer") ||
			descendant.IsA("Sound") ||
			descendant.IsA("ParticleEmitter")
		) {
			descendant.Destroy();
		} else if (descendant.IsA("BasePart")) {
			descendant.Transparency = 1;
			descendant.CanCollide = false;
			descendant.CanQuery = false;
			descendant.CanTouch = false;
			descendant.CastShadow = false;
		} else if (descendant.IsA("Decal")) {
			descendant.Transparency = 1;
		}
	}
	rig.Parent = parent;
	rig.ScaleTo(scale);
	// Inside the source giant: invisible there, and animated at the same detail as what the player sees.
	rig.PivotTo(source.GetPivot());
	return rig;
}

/** Plays the idle on `rig` frozen at PROBE_FREEZE_AT, or undefined when it has no Animator. */
function freezeIdle(rig: Model): AnimationTrack | undefined {
	const animator = rig.FindFirstChildOfClass("Humanoid")?.FindFirstChildOfClass("Animator");
	if (animator === undefined) return undefined;
	const animation = new Instance("Animation");
	animation.AnimationId = PROBE_ANIMATION;
	const track = animator.LoadAnimation(animation);
	track.Looped = true;
	track.Play(0, 1, 0);
	return track;
}

/** How far the Animator currently moves each joint of `rig`, by joint name. */
function jointTranslations(rig: Model): Map<string, number> {
	const lengths = new Map<string, number>();
	for (const descendant of rig.GetDescendants()) {
		if (isAnimatedJoint(descendant)) lengths.set(descendant.Name, descendant.Transform.Position.Magnitude);
	}
	return lengths;
}

/**
 * Measures how much farther the frozen idle moves the joints of a copy of
 * `source` ScaleTo'd to PROBE_SCALE than those of a copy at 1x. Yields;
 * undefined when the copies could not be made or the idle never loaded.
 */
function measureRatio(source: Model): number | undefined {
	const folder = new Instance("Folder");
	folder.Name = "AnimationScaleProbe";
	folder.Parent = Workspace;
	try {
		const reference = probeRig(source, 1, folder);
		const scaled = probeRig(source, PROBE_SCALE, folder);
		if (reference === undefined || scaled === undefined) return undefined;
		const referenceTrack = freezeIdle(reference);
		const scaledTrack = freezeIdle(scaled);
		if (referenceTrack === undefined || scaledTrack === undefined) return undefined;
		const deadline = os.clock() + PROBE_LOAD_SECONDS;
		for (const track of [referenceTrack, scaledTrack]) {
			while (track.Length <= 0 && os.clock() < deadline) task.wait();
			if (track.Length <= 0) return undefined;
			track.TimePosition = PROBE_FREEZE_AT;
			track.AdjustSpeed(0);
		}
		task.wait(PROBE_SETTLE_SECONDS);
		return translationRatio(jointTranslations(reference), jointTranslations(scaled));
	} finally {
		folder.Destroy();
	}
}

/**
 * Makes giants sized with Model:ScaleTo animate at their size, on this client.
 * The engine moves the joints of a ScaleTo'd rig by the scale squared; every
 * frame, after the Animator writes each joint's Transform and before physics
 * places the parts from it, this divides the translation by the giant's scale
 * (docs/giant-scaling.md, section 5). Transform does not replicate, so every
 * client runs its own. Posers that rotate C0 (RigPoser) compose with it.
 *
 * A one-time probe on the first whole giant to stream in checks the engine
 * still double-scales; if it has been fixed, the division turns itself off.
 * Until the probe answers, and if it cannot, the division stays on: that is
 * what the engine was last measured to need.
 */
@Controller({})
export class GiantScaleController implements OnStart {
	private readonly giants = new Map<Model, ScaledGiant>();
	private applying = FIXUP_MODE !== "never";
	private probeStarted = FIXUP_MODE !== "probe";

	onStart(): void {
		// Streaming adds and removes giants (staircase and arena alike) as the player moves.
		CollectionService.GetInstanceAddedSignal(SCALED_GIANT_TAG).Connect((instance) => this.add(instance));
		CollectionService.GetInstanceRemovedSignal(SCALED_GIANT_TAG).Connect((instance) => {
			if (instance.IsA("Model")) this.remove(instance);
		});
		for (const instance of CollectionService.GetTagged(SCALED_GIANT_TAG)) this.add(instance);

		RunService.Stepped.Connect(() => this.step());
	}

	private add(instance: Instance): void {
		if (!instance.IsA("Model") || this.giants.has(instance)) return;
		const attribute = instance.GetAttribute(ANIMATION_SCALE_ATTRIBUTE);
		const scale = typeIs(attribute, "number") ? attribute : instance.GetScale();
		if (scale <= 1) return;

		const giant: ScaledGiant = { scale, joints: new Map(), connections: [] };
		for (const descendant of instance.GetDescendants()) {
			if (isAnimatedJoint(descendant)) giant.joints.set(descendant, false);
		}
		// Parts can stream in after the model does, bringing their joints with them.
		giant.connections.push(
			instance.DescendantAdded.Connect((descendant) => {
				if (!isAnimatedJoint(descendant)) return;
				giant.joints.set(descendant, false);
				this.tryProbe(instance, giant);
			}),
			instance.DescendantRemoving.Connect((descendant) => {
				if (isAnimatedJoint(descendant)) giant.joints.delete(descendant);
			}),
		);
		this.giants.set(instance, giant);
		this.tryProbe(instance, giant);
	}

	private remove(model: Model): void {
		const giant = this.giants.get(model);
		if (giant === undefined) return;
		for (const connection of giant.connections) connection.Disconnect();
		this.giants.delete(model);
	}

	private step(): void {
		if (!this.applying) return;
		for (const [model, giant] of this.giants) {
			if (model.Parent === undefined) {
				this.remove(model);
				continue;
			}
			for (const [joint, written] of giant.joints) {
				const transform = joint.Transform;
				// Unchanged since our last write: the Animator skipped this joint this frame.
				if (written !== false && transform.FuzzyEq(written, 1e-6)) continue;
				const corrected = correctedTransform(transform, giant.scale);
				joint.Transform = corrected;
				giant.joints.set(joint, corrected);
			}
		}
	}

	/** Starts the probe on `model` once it is a whole R15 rig; it runs once per client. */
	private tryProbe(model: Model, giant: ScaledGiant): void {
		if (this.probeStarted) return;
		let connected = 0;
		for (const [joint] of giant.joints) if (isConnected(joint)) connected += 1;
		if (connected < R15_JOINT_COUNT) return;
		if (model.FindFirstChildOfClass("Humanoid")?.FindFirstChildOfClass("Animator") === undefined) return;

		this.probeStarted = true;
		task.spawn(() => {
			const [ok, result] = pcall(measureRatio, model);
			const ratio = ok ? result : undefined;
			const verdict = probeVerdict(ratio, PROBE_SCALE);
			this.applying = shouldApplyFixup(verdict);
			const measured = ratio === undefined ? "no measurement" : `${string.format("%.2f", ratio)}x at ${PROBE_SCALE}x`;
			if (verdict === "inconclusive") {
				warn(
					`[push-a-giant] ScaleTo animation probe inconclusive (${ok ? measured : tostring(result)}); correcting giant joints anyway`,
				);
			} else {
				print(
					`[push-a-giant] ScaleTo animation probe: joints move ${measured}, engine ${verdict}; fix-up ${this.applying ? "on" : "off"}`,
				);
			}
		});
	}
}
