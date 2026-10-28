import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import Signal from "@rbxts/signal";
import { PlayerDataNode } from "server/services/player/player-data-node";
import { PLAYER_LOADED_TAG } from "server/services/player/player-tags";
import { TrainingAttribute } from "shared/features/training/training-attributes";
import { totalMultiplier } from "./training-rules";

/**
 * A player's Strength and its only write path. Strength is permanent: it only
 * ever grows, so spending, deaths and equipment changes never take it away.
 *
 * Other features may multiply it (a worn power, say) through setMultiplier.
 * The saved Strength never changes for that; the effective Strength (saved
 * times every multiplier) is what fights, the leaderboard and the HUD use.
 */
@Component({ tag: PLAYER_LOADED_TAG })
export class StrengthStat extends BaseComponent<{}, Player> implements OnStart {
	/** Fires with the effective Strength whenever it changes. */
	public readonly strengthChanged = new Signal<(effective: number) => void>();
	private readonly multipliers = new Map<string, number>();

	constructor(private readonly dataNode: PlayerDataNode) {
		super();
	}

	onStart(): void {
		this.instance.SetAttribute(TrainingAttribute.StrengthMultiplier, this.getMultiplier());
	}

	/** Strength as saved: what training has earned. */
	public getStrength(): number {
		return this.dataNode.getData().Strength;
	}

	/** Saved Strength times every multiplier: the Strength the player fights with. */
	public getEffectiveStrength(): number {
		return this.getStrength() * this.getMultiplier();
	}

	public getMultiplier(): number {
		return totalMultiplier(this.multipliers);
	}

	/** Adds Strength. Zero, negative and NaN amounts are dropped. */
	public addStrength(amount: number): void {
		if (!(amount > 0)) return;

		this.dataNode.set("Strength", this.getStrength() + amount);
		this.strengthChanged.Fire(this.getEffectiveStrength());
	}

	/**
	 * Sets the multiplier a feature applies, under its own name; undefined
	 * removes it. Values below 1, and NaN, are ignored: nothing shrinks Strength.
	 */
	public setMultiplier(source: string, multiplier: number | undefined): void {
		if (multiplier === undefined) this.multipliers.delete(source);
		else if (multiplier >= 1) this.multipliers.set(source, multiplier);
		else return;

		this.instance.SetAttribute(TrainingAttribute.StrengthMultiplier, this.getMultiplier());
		this.strengthChanged.Fire(this.getEffectiveStrength());
	}

	override destroy(): void {
		this.strengthChanged.Destroy();
		super.destroy();
	}
}
