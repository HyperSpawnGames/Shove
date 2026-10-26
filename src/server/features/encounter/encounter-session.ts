import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { RunService } from "@rbxts/services";
import { StrengthStat } from "server/features/training/strength-stat";
import { TrainingSession } from "server/features/training/training-session";
import { WinsWallet } from "server/features/wins/wins-wallet";
import { PlayerCharacter } from "server/services/player/player-character";
import { PLAYER_LOADED_TAG } from "server/services/player/player-tags";
import { EncounterAttribute, EncounterPhase } from "shared/features/encounter/encounter-attributes";
import { Arena, ArenaService } from "./arena-service";
import {
	BASE_SHOVE_GAIN,
	MAX_FIGHT_SECONDS,
	MAX_SHOVE_GAIN,
	MAX_SHOVES_PER_SECOND,
	METER_PUBLISH_RATE,
	READY_SECONDS,
	RESULT_SECONDS,
	SHOVE_BURST,
	START_METER,
	STRENGTH_RATIO_OFFSET,
} from "./encounter-config";
import {
	applyResistance,
	fightOutcome,
	FightOutcome,
	fullShoveBucket,
	ShoveBucket,
	shoveGain,
	strengthRatio,
	takeShove,
} from "./encounter-rules";
import type { GiantDefinition } from "./giants";

interface Fight {
	giant: GiantDefinition;
	arena: Arena;
	/** Where the player goes when the fight is over, win or lose. */
	returnTo: CFrame;
	phase: EncounterPhase;
	meter: number;
	struggleStartedAt: number;
	bucket: ShoveBucket;
	lastPublishedAt: number;
	connections: RBXScriptConnection[];
	threads: thread[];
}

/**
 * A player's giant fights. The server owns everything that decides one: the
 * meter, the giant's push, the shove rate cap, the outcome and the payout.
 * The client only draws it, from the Encounter* attributes.
 *
 * A fight runs Ready → Struggle → Won or Lost, then returns the player to the
 * lobby. Death, a new body or leaving ends it early with no reward.
 */
@Component({ tag: PLAYER_LOADED_TAG })
export class EncounterSession extends BaseComponent<{}, Player> implements OnStart {
	private fight?: Fight;
	private characterConnection?: RBXScriptConnection;

	constructor(
		private readonly arenas: ArenaService,
		private readonly character: PlayerCharacter,
		private readonly strength: StrengthStat,
		private readonly training: TrainingSession,
		private readonly wins: WinsWallet,
	) {
		super();
	}

	onStart(): void {
		this.characterConnection = this.character.characterAdded.Connect(() => this.abort());
	}

	public isFighting(): boolean {
		return this.fight !== undefined;
	}

	/** A challenge from the giant's prompt. Refused while fighting or without a living body. */
	public requestChallenge(giant: GiantDefinition, returnTo: CFrame): void {
		if (this.fight !== undefined) return;

		const body = this.character.getCharacter();
		const humanoid = body?.FindFirstChildOfClass("Humanoid");
		const root = humanoid?.RootPart;
		if (body === undefined || humanoid === undefined || root === undefined || humanoid.Health <= 0) return;

		const arena = this.arenas.build(this.instance, giant, humanoid.HipHeight + root.Size.Y / 2);
		if (arena === undefined) return;

		this.training.stop();
		const now = os.clock();
		const fight: Fight = {
			giant,
			arena,
			returnTo,
			phase: "Ready",
			meter: START_METER,
			struggleStartedAt: now,
			bucket: fullShoveBucket(now, SHOVE_BURST),
			lastPublishedAt: 0,
			connections: [],
			threads: [],
		};
		this.fight = fight;

		root.Anchored = true;
		body.PivotTo(arena.playerStart);
		fight.connections.push(humanoid.Died.Connect(() => this.abort()));

		this.instance.SetAttribute(EncounterAttribute.GiantName, giant.displayName);
		this.instance.SetAttribute(EncounterAttribute.Reward, giant.winsPayout);
		this.publish(fight, true);
		fight.threads.push(task.delay(READY_SECONDS, () => this.beginStruggle(fight)));
	}

	/** The requestShove intent: one push, if the fight is on and the rate cap allows it. */
	public requestShove(): void {
		const fight = this.fight;
		if (fight === undefined || fight.phase !== "Struggle") return;

		const [accepted, bucket] = takeShove(fight.bucket, os.clock(), MAX_SHOVES_PER_SECOND, SHOVE_BURST);
		fight.bucket = bucket;
		if (!accepted) return;

		const ratio = strengthRatio(this.strength.getStrength(), fight.giant.recommendedStrength, STRENGTH_RATIO_OFFSET);
		fight.meter += shoveGain(ratio, BASE_SHOVE_GAIN, MAX_SHOVE_GAIN);
		this.settle(fight);
	}

	private beginStruggle(fight: Fight): void {
		if (this.fight !== fight) return;

		fight.phase = "Struggle";
		fight.struggleStartedAt = os.clock();
		fight.bucket = fullShoveBucket(fight.struggleStartedAt, SHOVE_BURST);
		this.publish(fight, true);
		fight.connections.push(
			RunService.Heartbeat.Connect((dt) => {
				fight.meter = applyResistance(fight.meter, fight.giant.resistancePerSecond, dt);
				this.settle(fight);
			}),
		);
	}

	/** Ends the fight if the meter or the clock decides it, otherwise publishes the meter. */
	private settle(fight: Fight): void {
		const outcome = fightOutcome(fight.meter, os.clock() - fight.struggleStartedAt, MAX_FIGHT_SECONDS);
		if (outcome === undefined) {
			this.publish(fight, false);
			return;
		}
		this.finish(fight, outcome);
	}

	private finish(fight: Fight, outcome: FightOutcome): void {
		for (const connection of fight.connections) connection.Disconnect();
		fight.connections = [];

		fight.meter = math.clamp(fight.meter, 0, 1);
		fight.phase = outcome === "won" ? "Won" : "Lost";
		if (outcome === "won") this.wins.addWins(fight.giant.winsPayout);
		this.publish(fight, true);

		fight.threads.push(task.delay(RESULT_SECONDS, () => this.end(fight, true)));
	}

	/** Ends any fight now with no reward: death, a new body, leaving. */
	private abort(): void {
		const fight = this.fight;
		if (fight !== undefined) this.end(fight, false);
	}

	/** Tears the fight down. `returnBody` sends a living body back to the lobby. */
	private end(fight: Fight, returnBody: boolean): void {
		if (this.fight !== fight) return;
		this.fight = undefined;

		for (const connection of fight.connections) connection.Disconnect();
		for (const thread of fight.threads) {
			if (thread !== coroutine.running()) task.cancel(thread);
		}

		const body = this.character.getCharacter();
		const humanoid = body?.FindFirstChildOfClass("Humanoid");
		const root = humanoid?.RootPart;
		if (returnBody && body !== undefined && root !== undefined && humanoid!.Health > 0) {
			// Move while still anchored, so the new spot replicates before physics resumes.
			body.PivotTo(fight.returnTo);
			root.Anchored = false;
		} else if (root !== undefined) {
			root.Anchored = false;
		}

		this.arenas.destroy(fight.arena);
		for (const name of [
			EncounterAttribute.Phase,
			EncounterAttribute.Meter,
			EncounterAttribute.GiantName,
			EncounterAttribute.Reward,
		]) {
			this.instance.SetAttribute(name, undefined);
		}
	}

	private publish(fight: Fight, force: boolean): void {
		const now = os.clock();
		if (!force && now - fight.lastPublishedAt < 1 / METER_PUBLISH_RATE) return;

		fight.lastPublishedAt = now;
		this.instance.SetAttribute(EncounterAttribute.Phase, fight.phase);
		this.instance.SetAttribute(EncounterAttribute.Meter, math.clamp(fight.meter, 0, 1));
	}

	override destroy(): void {
		const fight = this.fight;
		if (fight !== undefined) this.end(fight, false);
		this.characterConnection?.Disconnect();
		super.destroy();
	}
}
