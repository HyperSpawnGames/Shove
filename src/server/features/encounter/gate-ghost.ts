import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { PlayerCharacter } from "server/services/player/player-character";
import { PLAYER_LOADED_TAG } from "server/services/player/player-tags";
import { GATE_GHOST_GROUP } from "./gate-collision";

const DEFAULT_GROUP = "Default";

/**
 * A player's pass through the staircase's gate walls: while on, every part
 * of their body (and of every body they respawn into) is in the ghost
 * collision group, which gate walls ignore. A dev tool for walking the
 * staircase; challenges still check progress, so it opens no fights.
 */
@Component({ tag: PLAYER_LOADED_TAG })
export class GateGhost extends BaseComponent<{}, Player> implements OnStart {
	private ghost = false;
	private characterConnection?: RBXScriptConnection;
	private partsConnection?: RBXScriptConnection;

	constructor(private readonly character: PlayerCharacter) {
		super();
	}

	onStart(): void {
		this.characterConnection = this.character.characterAdded.Connect((body) => this.apply(body));
	}

	public isGhost(): boolean {
		return this.ghost;
	}

	public setGhost(ghost: boolean): void {
		this.ghost = ghost;
		const body = this.character.getCharacter();
		if (body) this.apply(body);
	}

	/** Puts `body` in the group the current setting asks for, now and as parts are added. */
	private apply(body: Model): void {
		this.partsConnection?.Disconnect();
		this.partsConnection = undefined;

		const group = this.ghost ? GATE_GHOST_GROUP : DEFAULT_GROUP;
		for (const part of body.GetDescendants()) {
			if (part.IsA("BasePart")) part.CollisionGroup = group;
		}
		if (this.ghost) {
			// Accessories and tools arrive after the body.
			this.partsConnection = body.DescendantAdded.Connect((part) => {
				if (part.IsA("BasePart")) part.CollisionGroup = GATE_GHOST_GROUP;
			});
		}
	}

	override destroy(): void {
		this.characterConnection?.Disconnect();
		this.partsConnection?.Disconnect();
		super.destroy();
	}
}
