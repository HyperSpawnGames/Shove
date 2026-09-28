import { CenturionType, Command, CommandContext, Guard, Register } from "@rbxts/centurion";
import { Workspace } from "@rbxts/services";
import { SCALED_RIG_FIXUP_ATTRIBUTE } from "shared/features/scaled-rigs/scaled-rigs";
import { isAdmin } from "./admin-guard";

// scaled-rigs feature — remove alongside its folders.
@Register()
@Guard(isAdmin)
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- registered via the @Register decorator
class ScaledRigCommands {
	@Command({
		name: "fixup",
		description: "Turn the animation fix-up for scaled bodies on or off on every client, to compare",
		arguments: [{ name: "enabled", description: "true or false", type: CenturionType.Boolean }],
	})
	fixup(ctx: CommandContext, enabled: boolean) {
		Workspace.SetAttribute(SCALED_RIG_FIXUP_ATTRIBUTE, enabled);
		ctx.reply(`Scaled-rig animation fix-up ${enabled ? "on" : "off"}`);
	}
}
