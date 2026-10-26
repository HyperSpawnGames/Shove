import { Controller, OnStart } from "@flamework/core";
import { CollectionService, TweenService } from "@rbxts/services";
import { PlayerDataController } from "client/controllers/player-data-controller";
import { OPENS_AT_ATTRIBUTE, STAIRCASE_LOCK_TAG } from "shared/features/encounter/encounter-attributes";

const GATE_FADE_SECONDS = 0.8;

/**
 * Opens this player's way up the staircase, on this client only: gate walls
 * the player has unlocked stop colliding and fade out, and Challenge prompts
 * on giants still out of reach are hidden. Other players see their own
 * progress. The server refuses a locked challenge whatever this shows.
 */
@Controller({})
export class StaircaseController implements OnStart {
	private highestCleared = 0;

	constructor(private readonly data: PlayerDataController) {}

	onStart(): void {
		// Streaming adds and removes locked things as the player moves, so each
		// arrival is synced on its own.
		CollectionService.GetInstanceAddedSignal(STAIRCASE_LOCK_TAG).Connect((instance) => this.sync(instance, false));
		for (const instance of CollectionService.GetTagged(STAIRCASE_LOCK_TAG)) this.sync(instance, false);

		this.data.onReady((data) => this.setHighestCleared(data.HighestCleared, false));
		this.data.subscribe(["HighestCleared"], () => {
			const highest = this.data.getData()?.HighestCleared;
			if (highest !== undefined) this.setHighestCleared(highest, true);
		});
	}

	private setHighestCleared(highest: number, animate: boolean): void {
		this.highestCleared = highest;
		for (const instance of CollectionService.GetTagged(STAIRCASE_LOCK_TAG)) this.sync(instance, animate);
	}

	private sync(instance: Instance, animate: boolean): void {
		const opensAt = instance.GetAttribute(OPENS_AT_ATTRIBUTE);
		if (!typeIs(opensAt, "number")) return;
		const open = this.highestCleared >= opensAt;

		if (instance.IsA("ProximityPrompt")) {
			instance.Enabled = open;
		} else if (instance.IsA("BasePart") && open && instance.CanCollide) {
			instance.CanCollide = false;
			for (const gui of instance.GetDescendants()) {
				if (gui.IsA("BillboardGui")) gui.Enabled = false;
			}
			if (animate) {
				TweenService.Create(instance, new TweenInfo(GATE_FADE_SECONDS), { Transparency: 1 }).Play();
			} else {
				instance.Transparency = 1;
			}
		}
	}
}
