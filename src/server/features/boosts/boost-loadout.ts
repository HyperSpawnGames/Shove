import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { TrainingSession } from "server/features/training/training-session";
import { StrengthStat } from "server/features/training/strength-stat";
import { WinsWallet } from "server/features/wins/wins-wallet";
import { PlayerCharacter } from "server/services/player/player-character";
import { PlayerDataNode } from "server/services/player/player-data-node";
import { PLAYER_LOADED_TAG } from "server/services/player/player-tags";
import { BoostKind, buyPrice, canWear, findOutline, findPower, type Owned } from "shared/features/boosts/boost-catalog";
import { dressCharacter } from "./boost-visuals";

/** The name this feature's bonus and multiplier go by in training. */
const SOURCE = "boosts";

/**
 * A player's outlines and powers, and the only write path for them. Buying
 * spends Wins on a ladder's next tier and wears it; wearing switches to any
 * tier already bought. What is worn feeds training (the outline's bonus on
 * every rep, the power's multiplier on Strength) and dresses every body the
 * player spawns with.
 */
@Component({ tag: PLAYER_LOADED_TAG })
export class BoostLoadout extends BaseComponent<{}, Player> implements OnStart {
	private characterConnection?: RBXScriptConnection;

	constructor(
		private readonly dataNode: PlayerDataNode,
		private readonly wins: WinsWallet,
		private readonly training: TrainingSession,
		private readonly strength: StrengthStat,
		private readonly character: PlayerCharacter,
	) {
		super();
	}

	onStart(): void {
		this.apply();
		this.characterConnection = this.character.characterAdded.Connect((body) => this.dress(body));
	}

	/** The requestBuyBoost intent: the ladder's next tier, if the player can afford it. */
	public requestBuy(kind: BoostKind, id: string): void {
		const price = buyPrice(kind, id, this.owned(kind), this.wins.getWins());
		if (price === undefined || !this.wins.spendWins(price)) return;

		if (kind === "outline") this.dataNode.setEntry("Outlines", id, true);
		else this.dataNode.setEntry("Powers", id, true);
		this.wear(kind, id);
	}

	/** The requestEquipBoost intent: a tier already bought, or "" for none. */
	public requestEquip(kind: BoostKind, id: string): void {
		if (!canWear(id, this.owned(kind))) return;
		this.wear(kind, id);
	}

	private owned(kind: BoostKind): Owned {
		const data = this.dataNode.getData();
		return kind === "outline" ? data.Outlines : data.Powers;
	}

	private wear(kind: BoostKind, id: string): void {
		this.dataNode.set(kind === "outline" ? "EquippedOutline" : "EquippedPower", id);
		this.apply();
	}

	private apply(): void {
		const data = this.dataNode.getData();
		this.training.setRepBonus(SOURCE, findOutline(data.EquippedOutline)?.bonusPerRep);
		this.strength.setMultiplier(SOURCE, findPower(data.EquippedPower)?.multiplier);
		this.dress();
	}

	private dress(body = this.character.getCharacter()): void {
		if (body === undefined) return;
		const data = this.dataNode.getData();
		dressCharacter(body, findOutline(data.EquippedOutline), findPower(data.EquippedPower));
	}

	override destroy(): void {
		this.characterConnection?.Disconnect();
		super.destroy();
	}
}
