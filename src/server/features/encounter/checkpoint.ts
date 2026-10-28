import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import Signal from "@rbxts/signal";
import { RunService, StarterPlayer } from "@rbxts/services";
import { PlayerCharacter } from "server/services/player/player-character";
import { PlayerDataNode } from "server/services/player/player-data-node";
import { PLAYER_LOADED_TAG } from "server/services/player/player-tags";
import { MAX_WALK_SPEED } from "./encounter-config";
import { EncounterService } from "./encounter-service";
import { walkSpeedFor } from "./progress-rules";
import { checkpointSpawn, standingOn } from "./world-layout";

/** Seconds between checks of where the body stands. */
const CHECK_EVERY = 0.25;

/**
 * The empty spacer terraces between quads, for one player. Where they come
 * back after dying: the last one they stood on this session, or the spawn if
 * none. And the quads they have finished, saved: reaching the spacer after a
 * quad finishes it, and each quad finished raises their walk speed, up to
 * MAX_WALK_SPEED at the last spacer. The only write path for QuadsFinished.
 */
@Component({ tag: PLAYER_LOADED_TAG })
export class Checkpoint extends BaseComponent<{}, Player> implements OnStart {
	/** Fires with the new count when the player finishes a quad for the first time. */
	public readonly quadsFinishedChanged = new Signal<(finished: number) => void>();
	/** Index into EncounterService.getCheckpoints(), once one is touched. */
	private reached?: number;
	private running = true;
	private characterConnection?: RBXScriptConnection;

	constructor(
		private readonly character: PlayerCharacter,
		private readonly encounter: EncounterService,
		private readonly dataNode: PlayerDataNode,
	) {
		super();
	}

	onStart(): void {
		this.applyWalkSpeed();
		this.characterConnection = this.character.characterAdded.Connect((body) => this.placeOnCheckpoint(body));
		task.spawn(() => {
			while (this.running) {
				this.notice();
				task.wait(CHECK_EVERY);
			}
		});
	}

	public getQuadsFinished(): number {
		return this.dataNode.getData().QuadsFinished;
	}

	/** Remembers the checkpoint the body is standing on, if any, and finishes the quad before it. */
	private notice(): void {
		const root = this.character.getCharacter()?.FindFirstChildOfClass("Humanoid")?.RootPart;
		if (root === undefined) return;
		const checkpoints = this.encounter.getCheckpoints();
		for (let i = 0; i < checkpoints.size(); i++) {
			if (standingOn(root.Position, checkpoints[i])) {
				this.reached = i;
				this.recordQuadsFinished(i + 1);
				return;
			}
		}
	}

	/** Saves `finished` quads if it is more than before, and speeds the player up for them. */
	private recordQuadsFinished(finished: number): void {
		if (finished <= this.getQuadsFinished()) return;
		this.dataNode.set("QuadsFinished", finished);
		this.applyWalkSpeed();
		this.quadsFinishedChanged.Fire(finished);
	}

	private applyWalkSpeed(): void {
		this.character.setBaseWalkSpeed(
			walkSpeedFor(
				this.getQuadsFinished(),
				this.encounter.getCheckpoints().size(),
				StarterPlayer.CharacterWalkSpeed,
				MAX_WALK_SPEED,
			),
		);
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
		this.quadsFinishedChanged.Destroy();
		super.destroy();
	}
}
