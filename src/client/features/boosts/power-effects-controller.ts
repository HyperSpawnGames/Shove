import { Controller, OnStart } from "@flamework/core";
import { Players, RunService } from "@rbxts/services";
import { POWER_ATTRIBUTE } from "shared/features/boosts/boost-catalog";
import { attachPower, PowerEffect, R15_LIMBS, R6_LIMBS } from "./power-effects";

const LIMBS = new Set([...R15_LIMBS, ...R6_LIMBS]);

/**
 * Draws the power every body wears, each player's included, from the id the
 * server puts in its POWER_ATTRIBUTE. Redraws when the power changes or a
 * hand or foot is replaced (the avatar's own are swapped in just after
 * spawning), and drops the effect with the body.
 */
@Controller({})
export class PowerEffectsController implements OnStart {
	private readonly effects = new Map<Model, PowerEffect>();

	onStart(): void {
		for (const player of Players.GetPlayers()) this.watch(player);
		Players.PlayerAdded.Connect((player) => this.watch(player));
		RunService.RenderStepped.Connect((dt) => {
			for (const [, effect] of this.effects) effect.step(dt);
		});
	}

	private watch(player: Player): void {
		if (player.Character) this.track(player.Character);
		player.CharacterAdded.Connect((character) => this.track(character));
	}

	private track(character: Model): void {
		const redraw = () => {
			this.effects.get(character)?.destroy();
			this.effects.delete(character);
			const id = character.GetAttribute(POWER_ATTRIBUTE);
			const effect = typeIs(id, "string") ? attachPower(character, id) : undefined;
			if (effect !== undefined) this.effects.set(character, effect);
		};

		redraw();
		character.GetAttributeChangedSignal(POWER_ATTRIBUTE).Connect(redraw);
		character.ChildAdded.Connect((child) => {
			if (LIMBS.has(child.Name) && character.GetAttribute(POWER_ATTRIBUTE) !== undefined) redraw();
		});
		// A body the server removes only leaves this client's world; it is not destroyed here.
		const connections: RBXScriptConnection[] = [];
		const drop = () => {
			this.effects.get(character)?.destroy();
			this.effects.delete(character);
			for (const connection of connections) connection.Disconnect();
		};
		connections.push(
			character.AncestryChanged.Connect(() => {
				if (!character.IsDescendantOf(game)) drop();
			}),
			character.Destroying.Connect(drop),
		);
	}
}
