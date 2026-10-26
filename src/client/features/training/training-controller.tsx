import { Controller, OnStart } from "@flamework/core";
import React from "@rbxts/react";
import { Players, UserInputService } from "@rbxts/services";
import { UiController } from "client/controllers/ui-controller";
import { Events } from "client/network";
import { TrainingAttribute } from "shared/features/training/training-attributes";
import { MOVE_DEADZONE, PUSH_UP_ANIMATION_ID, TRAIN_KEY } from "./training-config";
import { TrainingHud } from "./training-hud";

/**
 * The client half of training: mounts the HUD, binds the Train key, asks to
 * stop the moment the player moves or jumps, and loops the push-up animation
 * while the server reports a session. The server still decides every rep.
 */
@Controller({})
export class TrainingController implements OnStart {
	private readonly player = Players.LocalPlayer;
	private characterConnections: RBXScriptConnection[] = [];
	private track?: AnimationTrack;

	constructor(private readonly ui: UiController) {}

	onStart(): void {
		this.ui.mount("TrainingHud", <TrainingHud onToggle={() => this.toggle()} />);

		UserInputService.InputBegan.Connect((input, processed) => {
			if (!processed && input.KeyCode === TRAIN_KEY) this.toggle();
		});

		this.player.GetAttributeChangedSignal(TrainingAttribute.Training).Connect(() => this.syncAnimation());
		this.player.GetAttributeChangedSignal(TrainingAttribute.SecondsPerRep).Connect(() => this.syncAnimation());

		// onCharacterAdded waits for the Humanoid; never yield inside onStart.
		this.player.CharacterAdded.Connect((character) => this.onCharacterAdded(character));
		const character = this.player.Character;
		if (character) task.spawn(() => this.onCharacterAdded(character));
	}

	private isTraining(): boolean {
		return this.player.GetAttribute(TrainingAttribute.Training) === true;
	}

	/** Train starts or stops a session; the server ignores a start it would not allow. */
	public toggle(): void {
		if (this.isTraining()) Events.requestStopTraining.fire();
		else Events.requestStartTraining.fire();
	}

	private onCharacterAdded(character: Model): void {
		for (const connection of this.characterConnections) connection.Disconnect();
		this.characterConnections = [];
		this.track = undefined;

		const humanoid = character.WaitForChild("Humanoid", 5) as Humanoid | undefined;
		if (humanoid === undefined) return;

		// Training must never trap the avatar: any movement input ends it at once,
		// before the server notices the body has left its spot.
		const stopIfMoving = () => {
			if (this.isTraining() && humanoid.MoveDirection.Magnitude > MOVE_DEADZONE) Events.requestStopTraining.fire();
		};
		this.characterConnections.push(humanoid.GetPropertyChangedSignal("MoveDirection").Connect(stopIfMoving));
		this.characterConnections.push(
			humanoid.Jumping.Connect((active) => {
				if (active && this.isTraining()) Events.requestStopTraining.fire();
			}),
		);

		this.track = this.loadTrack(humanoid);
		this.syncAnimation();
	}

	private loadTrack(humanoid: Humanoid): AnimationTrack | undefined {
		if (PUSH_UP_ANIMATION_ID === "") return undefined;

		const animator = humanoid.FindFirstChildOfClass("Animator") ?? (humanoid.WaitForChild("Animator", 5) as Animator);
		if (animator === undefined) return undefined;

		const animation = new Instance("Animation");
		animation.AnimationId = PUSH_UP_ANIMATION_ID;
		const track = animator.LoadAnimation(animation);
		track.Looped = true;
		track.Priority = Enum.AnimationPriority.Action;
		return track;
	}

	/** One loop of the animation per rep, so a faster aura visibly speeds it up. */
	private syncAnimation(): void {
		const track = this.track;
		if (track === undefined) return;

		if (!this.isTraining()) {
			if (track.IsPlaying) track.Stop(0.15);
			return;
		}

		const secondsPerRep = this.player.GetAttribute(TrainingAttribute.SecondsPerRep);
		const speed =
			typeIs(secondsPerRep, "number") && secondsPerRep > 0 && track.Length > 0 ? track.Length / secondsPerRep : 1;
		if (!track.IsPlaying) track.Play(0.15);
		track.AdjustSpeed(speed);
	}
}
