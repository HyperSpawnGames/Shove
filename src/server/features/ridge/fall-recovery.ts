import { BaseComponent, Component } from "@flamework/components";
import { OnTick } from "@flamework/core";
import { PlayerCharacter } from "server/services/player/player-character";
import { PLAYER_LOADED_TAG } from "server/services/player/player-tags";
import { hasFallen } from "./fall-policy";
import { RIDGE_CONFIG } from "./ridge-config";
import { terraceIndexAt } from "./ridge-layout";
import { RidgeService } from "./ridge-service";

/**
 * Seconds to leave a returned body alone. The body is client-owned, so the
 * server keeps seeing it where it fell until the client catches up with the
 * teleport.
 */
const RECOVERY_COOLDOWN = 1;

/** Returns a player who falls off the ridge to the arrival point of the terrace they fell from. */
@Component({ tag: PLAYER_LOADED_TAG })
export class FallRecovery extends BaseComponent<{}, Player> implements OnTick {
	private recoveredAt = -math.huge;

	constructor(
		private readonly character: PlayerCharacter,
		private readonly ridge: RidgeService,
	) {
		super();
	}

	onTick(): void {
		const body = this.character.getCharacter();
		const root = body?.PrimaryPart;
		const humanoid = body?.FindFirstChildOfClass("Humanoid");
		if (body === undefined || root === undefined || humanoid === undefined || humanoid.Health <= 0) return;
		if (os.clock() - this.recoveredAt < RECOVERY_COOLDOWN) return;

		const layout = this.ridge.getLayout();
		const index = terraceIndexAt(layout, root.Position.Z);
		const bodyHeight = RIDGE_CONFIG.playerHeight * body.GetScale();
		if (!hasFallen(root.Position.Y, layout.terraces[index].topY, layout.valleyY, bodyHeight)) return;

		this.recoveredAt = os.clock();
		this.ridge.teleport(body, index);
	}
}
