import { Components } from "@flamework/components";
import { Dependency } from "@flamework/core";
import { Centurion, CenturionType, Command, CommandContext, CommandGuard, Guard, Register } from "@rbxts/centurion";
import { RunService, StarterPlayer } from "@rbxts/services";
import { ArenaProgress } from "server/features/encounter/arena-progress";
import { GateGhost } from "server/features/encounter/gate-ghost";
import { StrengthStat } from "server/features/training/strength-stat";
import { WinsWallet } from "server/features/wins/wins-wallet";
import { PlayerCharacter } from "server/services/player/player-character";
import { PlayerDataNode } from "server/services/player/player-data-node";

const ADMIN_IDS = new Set<number>([418255008]);
/** superwalk's speed, as a multiple of the default walk speed. */
const SUPERWALK_SPEED_FACTOR = 10;

const isAdmin: CommandGuard = (ctx) => {
	if (!RunService.IsStudio() && !ADMIN_IDS.has(ctx.executor.UserId)) {
		ctx.error("Insufficient permission!");
		return false;
	}
	return true;
};

function formatValue(lines: string[], value: unknown, depth: number): void {
	const indent = "  ".rep(depth);
	if (typeIs(value, "table")) {
		for (const [k, v] of pairs(value as Record<string, unknown>)) {
			if (typeIs(v, "table")) {
				lines.push(`${indent}${k}:`);
				formatValue(lines, v, depth + 1);
			} else {
				lines.push(`${indent}${k}: ${tostring(v)}`);
			}
		}
	} else {
		lines.push(`${indent}${tostring(value)}`);
	}
}

@Register()
@Guard(isAdmin)
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- registered via the @Register decorator
class AdminCommands {
	@Command({ name: "help", description: "List every dev command and its arguments" })
	help(ctx: CommandContext) {
		const lines: string[] = [];
		for (const command of Centurion.server().registry.getCommands()) {
			const args = (command.options.arguments ?? []).map((arg) => `<${arg.name}>`).join(" ");
			const usage = args === "" ? command.getPath().toString() : `${command.getPath().toString()} ${args}`;
			lines.push(`${usage}  - ${command.options.description ?? ""}`);
		}
		lines.sort();
		ctx.reply(lines.join("\n"));
	}

	@Command({
		name: "viewdata",
		description: "View a player's data",
		arguments: [{ name: "player", description: "The target player", type: CenturionType.Player }],
	})
	viewData(ctx: CommandContext, player: Player) {
		const dataNode = Dependency<Components>().getComponent<PlayerDataNode>(player);

		if (!dataNode) {
			ctx.error(`Player data not loaded for ${player.Name}`);
			return;
		}

		const lines: string[] = [`--- ${player.Name} ---`];
		formatValue(lines, dataNode.getData(), 0);
		ctx.reply(lines.join("\n"));
	}

	@Command({
		name: "setspeed",
		description: "Set a player's walk speed for this body and every respawn; omit the speed to reset",
		arguments: [
			{ name: "player", description: "The target player", type: CenturionType.Player },
			{
				name: "speed",
				description: "Studs per second; the default is StarterPlayer.CharacterWalkSpeed",
				type: CenturionType.Number,
				optional: true,
			},
		],
	})
	setSpeed(ctx: CommandContext, player: Player, speed?: number) {
		const character = Dependency<Components>().getComponent<PlayerCharacter>(player);
		if (!character) {
			ctx.error(`Player data not loaded for ${player.Name}`);
			return;
		}
		if (speed !== undefined && (speed < 0 || speed !== speed)) {
			ctx.error(`Rejected: speed must be a number of at least 0`);
			return;
		}

		character.setWalkSpeed(speed);
		ctx.reply(`${player.Name} walks at ${character.getWalkSpeed()} studs/s${speed === undefined ? " (default)" : ""}`);
	}

	// training feature — remove alongside the training folders.
	@Command({
		name: "givestrength",
		description: "Give Strength to a player",
		arguments: [
			{ name: "player", description: "The target player", type: CenturionType.Player },
			{ name: "amount", description: "Strength to add; must be above 0", type: CenturionType.Number },
		],
	})
	giveStrength(ctx: CommandContext, player: Player, amount: number) {
		const strength = Dependency<Components>().getComponent<StrengthStat>(player);

		if (!strength) {
			ctx.error(`Player data not loaded for ${player.Name}`);
			return;
		}
		if (!(amount > 0)) {
			ctx.error(`Rejected: Strength only grows, so the amount must be above 0`);
			return;
		}

		strength.addStrength(amount);
		ctx.reply(`Gave ${amount} Strength to ${player.Name} (now ${strength.getStrength()})`);
	}

	// encounter feature — remove alongside the encounter folders.
	@Command({
		name: "unlockgiants",
		description: "Open the staircase up to and including giant <count> (1 is the first), as if each below was beaten",
		arguments: [
			{ name: "player", description: "The target player", type: CenturionType.Player },
			{ name: "count", description: "Giants to mark as beaten", type: CenturionType.Number },
		],
	})
	unlockGiants(ctx: CommandContext, player: Player, count: number) {
		const progress = Dependency<Components>().getComponent<ArenaProgress>(player);

		if (!progress) {
			ctx.error(`Player data not loaded for ${player.Name}`);
			return;
		}
		if (!(count >= 1) || count % 1 !== 0) {
			ctx.error(`Rejected: count must be a whole number of at least 1`);
			return;
		}

		progress.recordWin(count - 1);
		ctx.reply(`${player.Name} has cleared ${progress.getHighestCleared()} giants`);
	}

	// encounter feature — remove alongside the encounter folders.
	@Command({
		name: "superwalk",
		description: "Toggle 10x walk speed and walking through staircase gate walls; stays on through respawns",
		arguments: [
			{ name: "player", description: "The target player", type: CenturionType.Player },
			{
				name: "enabled",
				description: "true or false; omit to toggle",
				type: CenturionType.Boolean,
				optional: true,
			},
		],
	})
	superWalk(ctx: CommandContext, player: Player, enabled?: boolean) {
		const components = Dependency<Components>();
		const character = components.getComponent<PlayerCharacter>(player);
		const ghost = components.getComponent<GateGhost>(player);

		if (!character || !ghost) {
			ctx.error(`Player data not loaded for ${player.Name}`);
			return;
		}

		const on = enabled ?? !ghost.isGhost();
		ghost.setGhost(on);
		character.setWalkSpeed(on ? StarterPlayer.CharacterWalkSpeed * SUPERWALK_SPEED_FACTOR : undefined);
		ctx.reply(
			on
				? `${player.Name} superwalks: ${character.getWalkSpeed()} studs/s, through gate walls`
				: `${player.Name} walks normally again (${character.getWalkSpeed()} studs/s)`,
		);
	}

	// wins feature — remove alongside the wins folders.
	@Command({
		name: "givewins",
		description: "Give Wins to a player",
		arguments: [
			{ name: "player", description: "The target player", type: CenturionType.Player },
			{ name: "amount", description: "Wins to add; must be above 0", type: CenturionType.Number },
		],
	})
	giveWins(ctx: CommandContext, player: Player, amount: number) {
		const wallet = Dependency<Components>().getComponent<WinsWallet>(player);

		if (!wallet) {
			ctx.error(`Player data not loaded for ${player.Name}`);
			return;
		}
		if (!(amount > 0)) {
			ctx.error(`Rejected: the amount must be above 0`);
			return;
		}

		wallet.addWins(amount);
		ctx.reply(`Gave ${amount} Wins to ${player.Name} (now ${wallet.getWins()})`);
	}
}
