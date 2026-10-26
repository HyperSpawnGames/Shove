import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { LeaderstatsService } from "server/services/leaderstats-service";
import { PLAYER_LOADED_TAG } from "server/services/player/player-tags";
import { WinsWallet } from "./wins-wallet";

/** Mirrors Wins into the player-list leaderstats column. */
@Component({ tag: PLAYER_LOADED_TAG })
export class WinsLeaderstats extends BaseComponent<{}, Player> implements OnStart {
	private connection?: RBXScriptConnection;

	constructor(
		private readonly wallet: WinsWallet,
		private readonly leaderstatsService: LeaderstatsService,
	) {
		super();
	}

	onStart(): void {
		const stat = this.leaderstatsService.addStat(this.instance, "Wins", this.wallet.getWins());

		this.connection = this.wallet.winsChanged.Connect((total) => {
			stat.Value = total;
		});
	}

	override destroy(): void {
		this.connection?.Disconnect();
		super.destroy();
	}
}
