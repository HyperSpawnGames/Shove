import { CommandGuard } from "@rbxts/centurion";
import { RunService } from "@rbxts/services";

const ADMIN_IDS = new Set<number>([418255008]);

/** Lets anyone run dev commands in Studio, and only the listed admins on a live server. */
export const isAdmin: CommandGuard = (ctx) => {
	if (!RunService.IsStudio() && !ADMIN_IDS.has(ctx.executor.UserId)) {
		ctx.error("Insufficient permission!");
		return false;
	}
	return true;
};
