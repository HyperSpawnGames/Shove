import { BaseComponent, Component } from "@flamework/components";
import Signal from "@rbxts/signal";
import { PlayerDataNode } from "server/services/player/player-data-node";
import { PLAYER_LOADED_TAG } from "server/services/player/player-tags";

/**
 * A player's Wins and their only write path. Wins are banked: earned from
 * giant victories, spent on upgrades, never lost to a defeat.
 */
@Component({ tag: PLAYER_LOADED_TAG })
export class WinsWallet extends BaseComponent<{}, Player> {
	public readonly winsChanged = new Signal<(total: number) => void>();

	constructor(private readonly dataNode: PlayerDataNode) {
		super();
	}

	public getWins(): number {
		return this.dataNode.getData().Wins;
	}

	/** Adds Wins. Zero, negative and NaN amounts are dropped. */
	public addWins(amount: number): void {
		if (!(amount > 0)) return;

		const total = this.getWins() + amount;
		this.dataNode.set("Wins", total);
		this.winsChanged.Fire(total);
	}

	/**
	 * Takes `amount` Wins if the player has that many, and says whether it
	 * did. Zero, negative and NaN amounts are refused.
	 */
	public spendWins(amount: number): boolean {
		if (!(amount > 0) || this.getWins() < amount) return false;

		const total = this.getWins() - amount;
		this.dataNode.set("Wins", total);
		this.winsChanged.Fire(total);
		return true;
	}

	override destroy(): void {
		this.winsChanged.Destroy();
		super.destroy();
	}
}
