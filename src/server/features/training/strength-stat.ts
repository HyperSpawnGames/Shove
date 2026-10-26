import { BaseComponent, Component } from "@flamework/components";
import Signal from "@rbxts/signal";
import { PlayerDataNode } from "server/services/player/player-data-node";
import { PLAYER_LOADED_TAG } from "server/services/player/player-tags";

/**
 * A player's Strength and its only write path. Strength is permanent: it only
 * ever grows, so spending, deaths and equipment changes never take it away.
 */
@Component({ tag: PLAYER_LOADED_TAG })
export class StrengthStat extends BaseComponent<{}, Player> {
	public readonly strengthChanged = new Signal<(total: number) => void>();

	constructor(private readonly dataNode: PlayerDataNode) {
		super();
	}

	public getStrength(): number {
		return this.dataNode.getData().Strength;
	}

	/** Adds Strength. Zero, negative and NaN amounts are dropped. */
	public addStrength(amount: number): void {
		if (!(amount > 0)) return;

		const total = this.getStrength() + amount;
		this.dataNode.set("Strength", total);
		this.strengthChanged.Fire(total);
	}

	override destroy(): void {
		this.strengthChanged.Destroy();
		super.destroy();
	}
}
