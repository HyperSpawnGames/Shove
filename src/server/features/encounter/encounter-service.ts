import { Components } from "@flamework/components";
import { OnStart, Service } from "@flamework/core";
import { Workspace } from "@rbxts/services";
import { Events } from "server/network";
import { STAIRCASE_FOLDER } from "shared/features/encounter/encounter-attributes";
import { EncounterSession } from "./encounter-session";
import { GIANTS } from "./giants";
import { buildGiant, buildRamp, buildTerrace } from "./staircase";
import { terraceLayout } from "./world-layout";

/**
 * Builds the staircase from the roster, one terrace, ramp, gate and giant per
 * entry, and routes each giant's prompt and the requestShove intent to the
 * player's EncounterSession. No session means the profile is not loaded yet,
 * so the request is dropped.
 */
@Service({})
export class EncounterService implements OnStart {
	constructor(private readonly components: Components) {}

	onStart(): void {
		const folder = new Instance("Folder");
		folder.Name = STAIRCASE_FOLDER;
		folder.Parent = Workspace;

		GIANTS.forEach((giant, tier) => {
			const layout = terraceLayout(tier);
			buildTerrace(folder, tier, layout);
			if (tier > 0) buildRamp(folder, tier, GIANTS[tier - 1]);

			const built = buildGiant(folder, tier, giant, layout);
			built?.prompt.Triggered.Connect((player) =>
				this.components.getComponent<EncounterSession>(player)?.requestChallenge(tier, built.returnTo),
			);
		});

		Events.requestShove.connect((player) => this.components.getComponent<EncounterSession>(player)?.requestShove());
	}
}
