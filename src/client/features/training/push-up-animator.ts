import { Controller, OnStart } from "@flamework/core";
import { Players, RunService } from "@rbxts/services";
import { RigPoser } from "client/util/rig-poser";
import { TrainingAttribute } from "shared/features/training/training-attributes";
import { PushUpPose } from "./push-up-pose";
import { PUSH_UP_ANIMATION_ID } from "./training-config";

/** Seconds to get down into the plank, or back up. */
const GET_DOWN_SECONDS = 0.35;

interface Body {
	character: Model;
	pose: PushUpPose;
	training: boolean;
	/** When the current session's first rep began, on this client's clock. */
	startedAt: number;
	/** 0 standing, 1 in the plank. */
	weight: number;
}

/**
 * Draws push-ups for every training player in view, the local one included,
 * from the Training attribute each Player carries: one rep per SecondsPerRep,
 * arms straight at the moment the server completes it. Code-driven, so it
 * stands in only while no push-up animation asset is set; an authored
 * animation replicates by itself.
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

		body?.pose.restore();
		const pose = PushUpPose.measure(character, new RigPoser(character));
		if (pose === undefined) return;
		this.bodies.set(player, { character, pose, training: true, startedAt: os.clock(), weight: 0 });
	}

	private step(dt: number): void {
		const now = os.clock();
		for (const [player, body] of this.bodies) {
			if (body.character.Parent === undefined || player.Character !== body.character) {
				this.bodies.delete(player);
				continue;
			}

			const step = dt / GET_DOWN_SECONDS;
			body.weight = body.training ? math.min(body.weight + step, 1) : math.max(body.weight - step, 0);
			if (body.weight <= 0 && !body.training) {
				body.pose.restore();
				this.bodies.delete(player);
				continue;
			}

			const secondsPerRep = player.GetAttribute(TrainingAttribute.SecondsPerRep);
			const period = typeIs(secondsPerRep, "number") && secondsPerRep > 0 ? secondsPerRep : 1;
			// Down and back up once per rep, arms straight as each rep completes.
			const depth = body.training ? 0.5 - 0.5 * math.cos(((now - body.startedAt) / period) * 2 * math.pi) : 0;
			body.pose.apply(depth, body.weight);
		}
	}
}
