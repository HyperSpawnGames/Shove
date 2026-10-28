import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { ArenaProgress } from "server/features/encounter/arena-progress";
import { GIANTS } from "server/features/encounter/giants";
import { TrainingSession } from "server/features/training/training-session";
import { StrengthStat } from "server/features/training/strength-stat";
import { WinsWallet } from "server/features/wins/wins-wallet";
import { PlayerCharacter } from "server/services/player/player-character";
import { PlayerDataNode } from "server/services/player/player-data-node";
import { PLAYER_LOADED_TAG } from "server/services/player/player-tags";
import {
	BoostKind,
	buyPrice,
	canWear,
	findOutline,
	findPower,
	findSize,
	SIZE_CAP_ATTRIBUTE,
	type Owned,
} from "shared/features/boosts/boost-catalog";
import { dressCharacter } from "./boost-visuals";
import { sizeCap } from "./size-rules";

/** The names this feature's bonus and multipliers go by in training. */
const SOURCE = "boosts";
const POWER_SOURCE = "boosts.power";
const SIZE_SOURCE = "boosts.size";
/** The longest a fresh body is given to load the avatar's appearance before it is dressed anyway. */
const APPEARANCE_WAIT_SECONDS = 10;

const GIANT_SCALES = GIANTS.map((giant) => giant.scale);

/**
 * A player's outlines, powers and sizes, and the only write path for them.
 * Buying spends Wins on a ladder's next tier and wears it; a size must also
 * fit under the size cap (three quarters of the first giant not yet beaten),
 * which the Player's SizeCap attribute shows the shop. Wearing switches to any
 * tier already bought. What is worn feeds training (the outline's bonus on
 * every rep, the power's and the size's multipliers on Strength) and dresses
 * every body the player spawns with.
 */
@Component({ tag: PLAYER_LOADED_TAG })
export class BoostLoadout extends BaseComponent<{}, Player> implements OnStart {
	private connections: RBXScriptConnection[] = [];

	constructor(
		private readonly dataNode: PlayerDataNode,
		private readonly wins: WinsWallet,
		private readonly training: TrainingSession,
		private readonly strength: StrengthStat,
		private readonly character: PlayerCharacter,
		private readonly progress: ArenaProgress,
	) {
		super();
	}

	onStart(): void {
		this.publishSizeCap();
		this.apply();
		this.connections.push(
			this.character.characterAdded.Connect((body) => this.dress(body)),
			this.progress.clearedChanged.Connect(() => this.publishSizeCap()),
		);
	}

	/** The requestBuyBoost intent: the ladder's next tier, if the player can afford it and it fits. */
	public requestBuy(kind: BoostKind, id: string): void {
		const price = buyPrice(kind, id, this.owned(kind), this.wins.getWins(), this.getSizeCap());
		if (price === undefined || !this.wins.spendWins(price)) return;

		if (kind === "outline") this.dataNode.setEntry("Outlines", id, true);
		else if (kind === "power") this.dataNode.setEntry("Powers", id, true);
		else this.dataNode.setEntry("Sizes", id, true);
		this.wear(kind, id);
	}

	/** The requestEquipBoost intent: a tier already bought, or "" for none. */
	public requestEquip(kind: BoostKind, id: string): void {
		if (!canWear(id, this.owned(kind))) return;
		this.wear(kind, id);
	}

	public getSizeCap(): number {
		return sizeCap(this.progress.getHighestCleared(), GIANT_SCALES);
	}

	private publishSizeCap(): void {
		this.instance.SetAttribute(SIZE_CAP_ATTRIBUTE, this.getSizeCap());
	}

	private owned(kind: BoostKind): Owned {
		const data = this.dataNode.getData();
		return kind === "outline" ? data.Outlines : kind === "power" ? data.Powers : data.Sizes;
	}

	private wear(kind: BoostKind, id: string): void {
		if (kind === "outline") this.dataNode.set("EquippedOutline", id);
		else if (kind === "power") this.dataNode.set("EquippedPower", id);
		else this.dataNode.set("EquippedSize", id);
		this.apply();
	}

	private apply(): void {
		const data = this.dataNode.getData();
		this.training.setRepBonus(SOURCE, findOutline(data.EquippedOutline)?.bonusPerRep);
		this.strength.setMultiplier(POWER_SOURCE, findPower(data.EquippedPower)?.multiplier);
		this.strength.setMultiplier(SIZE_SOURCE, findSize(data.EquippedSize)?.multiplier);
		this.dress();
	}

	private dress(body = this.character.getCharacter()): void {
		if (body === undefined) return;
		task.spawn(() => {
			// Loading the avatar's appearance resets its scale values and swaps
			// its hands and feet, so a fresh body is grown once that is done.
			const deadline = os.clock() + APPEARANCE_WAIT_SECONDS;
			while (!this.instance.HasAppearanceLoaded() && os.clock() < deadline) task.wait(0.1);
			if (body.Parent === undefined) return;

			const data = this.dataNode.getData();
			dressCharacter(
				body,
				findOutline(data.EquippedOutline),
				findPower(data.EquippedPower),
				findSize(data.EquippedSize),
			);
		});
	}

	override destroy(): void {
		for (const connection of this.connections) connection.Disconnect();
		super.destroy();
	}
}
