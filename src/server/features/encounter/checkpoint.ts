import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { RunService } from "@rbxts/services";
import { PlayerCharacter } from "server/services/player/player-character";
import { PLAYER_LOADED_TAG } from "server/services/player/player-tags";
import { EncounterService } from "./encounter-service";
import { checkpointSpawn, standingOn } from "./world-layout";

/** Seconds between checks of where the body stands. */
const CHECK_EVERY = 0.25;

/**
 * Where a player comes back after dying: the last spacer terrace between
 * quads they stood on, or the spawn if they have not reached one. Kept for
 * the session only; a rejoin starts at the spawn.
 */
@Component({ tag: PLAYER_LOADED_TAG })
export class Checkpoint extends BaseComponent<{}, Player> implements OnStart {
	/** Index into EncounterService.getCheckpoints(), once one is touched. */
	private reached?: number;
	private running = true;
	private characterConnection?: RBXScriptConnection;

	constructor(
		private readonly character: PlayerCharacter,
		private readonly encounter: EncounterService,
	) {
		super();
	}

	onStart(): void {
		this.characterConnection = this.character.characterAdded.Connect((body) => this.placeOnCheckpoint(body));
		task.spawn(() => {
			while (this.running) {
				this.notice();
				task.wait(CHECK_EVERY);
			}
		});
	}

	/** Remembers the checkpoint the body is standing on, if any. */
	private notice(): void {
		const root = this.character.getCharacter()?.FindFirstChildOfClass("Humanoid")?.RootPart;
		if (root === undefined) return;
		const checkpoints = this.encounter.getCheckpoints();
		for (let i = 0; i < checkpoints.size(); i++) {
			if (standingOn(root.Position, checkpoints[i])) {
				this.reached = i;
				return;
			}
		}
	}

	/**
	 * Moves a freshly spawned body onto the last checkpoint touched. A new body
	 * arrives before it is in the world, and the engine stands it on the spawn
	 * pad as it parents it, so the move waits for that and one frame more.
	 */
	private placeOnCheckpoint(body: Model): void {
		const reached = this.reached;
		if (reached === undefined) return;
		task.spawn(() => {
			while (body.Parent === undefined) body.AncestryChanged.Wait();
			RunService.Heartbeat.Wait();
			if (this.character.getCharacter() !== body) return;

			const layout = this.encounter.getCheckpoints()[reached];
			const humanoid = body.FindFirstChildOfClass("Humanoid");
			const root = humanoid?.RootPart;
			if (layout === undefined || humanoid === undefined || root === undefined) return;
			body.PivotTo(checkpointSpawn(layout, humanoid.HipHeight + root.Size.Y / 2));
		});
	}

	override destroy(): void {
		this.running = false;
		this.characterConnection?.Disconnect();
		super.destroy();
	}
}
