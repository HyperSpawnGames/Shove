import { Controller, OnStart } from "@flamework/core";
import React from "@rbxts/react";
import { Players, UserInputService } from "@rbxts/services";
import { UiController } from "client/controllers/ui-controller";
import { Events } from "client/network";
import { EncounterAttribute } from "shared/features/encounter/encounter-attributes";
import { SHOVES_PER_SECOND } from "./encounter-config";
import { EncounterHud } from "./encounter-hud";
import { FightScene } from "./fight-scene";

/**
 * The client half of a giant fight: mounts the fight HUD, sends shoves at no
 * more than the server's cap, and runs a FightScene while the server reports
 * a fight. The server decides every shove and the outcome.
 */
@Controller({})
export class EncounterController implements OnStart {
	private readonly player = Players.LocalPlayer;
	private scene?: FightScene;
	private lastShoveAt = 0;

	constructor(private readonly ui: UiController) {}

	onStart(): void {
		this.ui.mount("EncounterHud", <EncounterHud onShove={() => this.shove()} />, {
			ignoreGuiInset: true,
			displayOrder: 10,
		});

		UserInputService.InputBegan.Connect((input, processed) => {
			if (!processed && input.KeyCode === Enum.KeyCode.Space) this.shove();
		});

		this.player.GetAttributeChangedSignal(EncounterAttribute.Phase).Connect(() => this.syncPhase());
		this.syncPhase();
	}

	public shove(): void {
		if (this.player.GetAttribute(EncounterAttribute.Phase) !== "Struggle") return;

		const now = os.clock();
		if (now - this.lastShoveAt < 1 / SHOVES_PER_SECOND) return;
		this.lastShoveAt = now;
		Events.requestShove.fire();
	}

	private syncPhase(): void {
		const phase = this.player.GetAttribute(EncounterAttribute.Phase);
		if (phase === undefined) {
			this.scene?.stop();
			this.scene = undefined;
			return;
		}

		let scene = this.scene;
		if (scene === undefined) {
			const created = new FightScene(this.player);
			scene = created;
			this.scene = created;
			task.spawn(() => created.start());
		}
		if (phase === "Won") scene.throwLoser("giant");
		else if (phase === "Lost") scene.throwLoser("player");
	}
}
