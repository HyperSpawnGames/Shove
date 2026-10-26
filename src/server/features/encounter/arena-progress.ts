import { BaseComponent, Component } from "@flamework/components";
import { PlayerDataNode } from "server/services/player/player-data-node";
import { PLAYER_LOADED_TAG } from "server/services/player/player-tags";
import { canChallenge, clearedAfterWin } from "./progress-rules";

/**
 * A player's place on the staircase and its only write path. Progress only
 * grows: a first victory opens the next ramp for good, a replay or a defeat
 * changes nothing.
 */
@Component({ tag: PLAYER_LOADED_TAG })
export class ArenaProgress extends BaseComponent<{}, Player> {
	constructor(private readonly dataNode: PlayerDataNode) {
		super();
	}

	public getHighestCleared(): number {
		return this.dataNode.getData().HighestCleared;
	}

	public canChallenge(giantIndex: number): boolean {
		return canChallenge(giantIndex, this.getHighestCleared());
	}

	/** Records a victory over giant `giantIndex`; a first win opens the next one. */
	public recordWin(giantIndex: number): void {
		const current = this.getHighestCleared();
		const cleared = clearedAfterWin(giantIndex, current);
		if (cleared !== current) this.dataNode.set("HighestCleared", cleared);
	}
}
