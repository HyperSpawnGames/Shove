import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { LeaderstatsService } from "server/services/leaderstats-service";
import { PLAYER_LOADED_TAG } from "server/services/player/player-tags";
import { StrengthStat } from "./strength-stat";

/** Mirrors effective Strength into the player-list leaderstats column. */
@Component({ tag: PLAYER_LOADED_TAG })
export class StrengthLeaderstats extends BaseComponent<{}, Player> implements OnStart {
	private connection?: RBXScriptConnection;

	constructor(
		private readonly strength: StrengthStat,
		private readonly leaderstatsService: LeaderstatsService,
	) {
		super();
	}

	onStart(): void {
		const stat = this.leaderstatsService.addStat(this.instance, "Strength", this.strength.getEffectiveStrength());

		this.connection = this.strength.strengthChanged.Connect((total) => {
			stat.Value = total;
		});
	}

	override destroy(): void {
		this.connection?.Disconnect();
		super.destroy();
	}
}
