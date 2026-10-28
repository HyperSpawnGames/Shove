import { Controller, OnStart } from "@flamework/core";
import { Players, RunService } from "@rbxts/services";
import { pauseAnimate } from "client/util/pause-animate";
import { RigPoser } from "client/util/rig-poser";
import { TrainingAttribute } from "shared/features/training/training-attributes";
import { PushUpPose } from "./push-up-pose";
import { MOVE_DEADZONE, PUSH_UP_ANIMATION_ID } from "./training-config";

/** Seconds to get down into the plank, or back up. */
const GET_DOWN_SECONDS = 0.35;
/**
 * Horizontal speed, in studs per second, at which another player's body is
 * walking rather than doing a push-up (which shifts the root a little).
 */
const WALKING_SPEED = 8;

/**
 * Whether a body has set off walking: its own player's movement input for the
 * local body, which arrives before it moves; its speed for anyone else's.
 */
function isWalking(player: Player, character: Model): boolean {
	const humanoid = character.FindFirstChildOfClass("Humanoid");
	if (humanoid === undefined) return false;
	if (player === Players.LocalPlayer) return humanoid.MoveDirection.Magnitude > MOVE_DEADZONE;
	const root = humanoid.RootPart;
	return root !== undefined && root.AssemblyLinearVelocity.mul(new Vector3(1, 0, 1)).Magnitude > WALKING_SPEED;
}

interface Body {
	character: Model;
	pose: PushUpPose;
	training: boolean;
	/** When the current session's first rep began, on this client's clock. */
	startedAt: number;
	/** 0 standing, 1 in the plank. */
	weight: number;
	/** The local player's own idle, paused while the push-up drives the body. */
	resumeAnimate?: () => void;
}

/**
 * Draws push-ups for every training player in view, the local one included,
 * from the Training attribute each Player carries: one rep per SecondsPerRep,
 * arms straight at the moment the server completes it. Code-driven, so it
 * stands in only while no push-up animation asset is set; an authored
 * animation replicates by itself. The local player's own Animate pauses
 * while their push-ups run, so an animation pack's idle cannot bend the pose;
 * the tracks it stops stop for everyone watching.
 *
 * A body that sets off walking stands straight up at once, without waiting
 * for the server to end the session or for the get-up: a plank moving at
 * walking speed, with Animate still paused, hovers along the ground.
 */
@Controller({})
export class PushUpAnimator implements OnStart {
	private readonly bodies = new Map<Player, Body>();

	onStart(): void {
		if (PUSH_UP_ANIMATION_ID !== "") return;

		for (const player of Players.GetPlayers()) this.watch(player);
		Players.PlayerAdded.Connect((player) => this.watch(player));
		Players.PlayerRemoving.Connect((player) => this.bodies.delete(player));
		RunService.RenderStepped.Connect((dt) => this.step(dt));
	}

	private watch(player: Player): void {
		player.GetAttributeChangedSignal(TrainingAttribute.Training).Connect(() => this.sync(player));
		this.sync(player);
	}

	private sync(player: Player): void {
		const training = player.GetAttribute(TrainingAttribute.Training) === true;
		const body = this.bodies.get(player);
		if (!training) {
			if (body) body.training = false;
			return;
		}

		const character = player.Character;
		if (character === undefined) return;
		if (body !== undefined && body.character === character) {
			body.training = true;
			body.startedAt = os.clock();
			return;
		}

		if (body) this.release(player, body);
		const pose = PushUpPose.measure(character, new RigPoser(character));
		if (pose === undefined) return;
		const resumeAnimate = player === Players.LocalPlayer ? pauseAnimate(character) : undefined;
		this.bodies.set(player, { character, pose, training: true, startedAt: os.clock(), weight: 0, resumeAnimate });
	}

	private step(dt: number): void {
		const now = os.clock();
		for (const [player, body] of this.bodies) {
			if (
				body.character.Parent === undefined ||
				player.Character !== body.character ||
				isWalking(player, body.character)
			) {
				this.release(player, body);
				continue;
			}

			const step = dt / GET_DOWN_SECONDS;
			body.weight = body.training ? math.min(body.weight + step, 1) : math.max(body.weight - step, 0);
			if (body.weight <= 0 && !body.training) {
				this.release(player, body);
				continue;
			}

			const secondsPerRep = player.GetAttribute(TrainingAttribute.SecondsPerRep);
			const period = typeIs(secondsPerRep, "number") && secondsPerRep > 0 ? secondsPerRep : 1;
			// Down and back up once per rep, arms straight as each rep completes.
			const depth = body.training ? 0.5 - 0.5 * math.cos(((now - body.startedAt) / period) * 2 * math.pi) : 0;
			body.pose.apply(depth, body.weight);
		}
	}

	/** Stands the body back up and gives the local player their own idle back. */
	private release(player: Player, body: Body): void {
		body.pose.restore();
		body.resumeAnimate?.();
		this.bodies.delete(player);
	}
}
