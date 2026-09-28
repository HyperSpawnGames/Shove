import { Components } from "@flamework/components";
import { Dependency } from "@flamework/core";
import { CenturionType, Command, CommandContext, Guard, Register } from "@rbxts/centurion";
import { MAX_SCALE, MIN_SCALE } from "server/features/player-size/body-tuning";
import { PlayerSize } from "server/features/player-size/player-size";
import { isAdmin } from "./admin-guard";

// player-size feature — remove alongside its folder.
@Register()
@Guard(isAdmin)
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- registered via the @Register decorator
class PlayerSizeCommands {
	@Command({
		name: "size",
		description: `Resize a player (${MIN_SCALE}–${MAX_SCALE}×); omit the player to resize yourself`,
		arguments: [
			{ name: "scale", description: "1 is a normal avatar", type: CenturionType.Number },
			{ name: "player", description: "The target player", type: CenturionType.Player, optional: true },
		],
	})
	size(ctx: CommandContext, scale: number, player?: Player) {
		const target = player ?? ctx.executor;
		const size = Dependency<Components>().getComponent<PlayerSize>(target);
		if (!size) {
			ctx.error(`Player data not loaded for ${target.Name}`);
			return;
		}
		if (!size.setScale(scale)) {
			ctx.error(`Rejected: scale must be between ${MIN_SCALE} and ${MAX_SCALE}`);
			return;
		}
		ctx.reply(`${target.Name} is now ${scale}×`);
	}
}
