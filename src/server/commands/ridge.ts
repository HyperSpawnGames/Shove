import { Components } from "@flamework/components";
import { Dependency } from "@flamework/core";
import { CenturionType, Command, CommandContext, Guard, Register } from "@rbxts/centurion";
import { RIDGE_CONFIG } from "server/features/ridge/ridge-config";
import { RidgeService } from "server/features/ridge/ridge-service";
import { PlayerCharacter } from "server/services/player/player-character";
import { isAdmin } from "./admin-guard";

// ridge feature — remove alongside its folder.
@Register()
@Guard(isAdmin)
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- registered via the @Register decorator
class RidgeCommands {
	@Command({
		name: "tp",
		description: "Teleport to a terrace's arrival point (0 is the base); omit the player to move yourself",
		arguments: [
			{ name: "terrace", description: `0–${RIDGE_CONFIG.terraceCount}`, type: CenturionType.Integer },
			{ name: "player", description: "The target player", type: CenturionType.Player, optional: true },
		],
	})
	tp(ctx: CommandContext, terrace: number, player?: Player) {
		if (terrace < 0 || terrace > RIDGE_CONFIG.terraceCount) {
			ctx.error(`Rejected: terrace must be between 0 and ${RIDGE_CONFIG.terraceCount}`);
			return;
		}
		const target = player ?? ctx.executor;
		const body = Dependency<Components>().getComponent<PlayerCharacter>(target)?.getCharacter();
		if (!body) {
			ctx.error(`${target.Name} has no character`);
			return;
		}
		Dependency<RidgeService>().teleport(body, terrace);
		ctx.reply(`${target.Name} is on terrace ${terrace}`);
	}

	@Command({
		name: "throw",
		description: "Throw a terrace's giant off the cliff; a new one stands in after a few seconds",
		arguments: [{ name: "terrace", description: `1–${RIDGE_CONFIG.terraceCount}`, type: CenturionType.Integer }],
	})
	throwGiant(ctx: CommandContext, terrace: number) {
		if (terrace < 1 || terrace > RIDGE_CONFIG.terraceCount) {
			ctx.error(`Rejected: terrace must be between 1 and ${RIDGE_CONFIG.terraceCount}`);
			return;
		}
		if (!Dependency<RidgeService>().throwGiant(terrace)) {
			ctx.error(`No giant is standing on terrace ${terrace}`);
			return;
		}
		ctx.reply(`Threw terrace ${terrace}'s giant`);
	}
}
