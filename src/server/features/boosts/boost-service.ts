import { Components } from "@flamework/components";
import { OnStart, Service } from "@flamework/core";
import { Events } from "server/network";
import { BoostLoadout } from "./boost-loadout";

/**
 * Routes the boost intents to the player's loadout. No loadout means the
 * profile is not loaded yet, so the intent is dropped.
 */
@Service({})
export class BoostService implements OnStart {
	constructor(private readonly components: Components) {}

	onStart(): void {
		Events.requestBuyBoost.connect((player, kind, id) =>
			this.components.getComponent<BoostLoadout>(player)?.requestBuy(kind, id),
		);
		Events.requestEquipBoost.connect((player, kind, id) =>
			this.components.getComponent<BoostLoadout>(player)?.requestEquip(kind, id),
		);
	}
}
