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
	FIRST_SURGE_DELAY,
	READY_SECONDS,
	RESULT_SECONDS,
	SHOVE_BURST,
	START_METER,
	STRENGTH_RATIO_OFFSET,
	SURGE_SHARE,
	SURGE_TIMING,
} from "./encounter-config";
import {
	fightOutcome,
	FightOutcome,
	fullShoveBucket,
	planSurge,
	resistanceBetween,
	ShoveBucket,
	shoveGain,
	splitResistance,
	strengthRatio,
	SurgePlan,
	surgeState,
	takeShove,
} from "./encounter-rules";
import { ArenaProgress } from "./arena-progress";
import { GiantDefinition, GIANTS } from "./giants";

interface Fight {
	giant: GiantDefinition;
	/** The giant's place on the staircase. */
	giantIndex: number;
	arena: Arena;
	/** Where the player goes when the fight is over, win or lose. */
	returnTo: CFrame;
	phase: EncounterPhase;
	meter: number;
	struggleStartedAt: number;
	bucket: ShoveBucket;
	/** The giant's next (or current) surge, and the clock of the last push applied. */
	surge: SurgePlan;
	pushedUntil: number;
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
		private readonly progress: ArenaProgress,
	) {
		super();
	}

	onStart(): void {
		this.characterConnection = this.character.characterAdded.Connect(() => this.abort());
	}

	public isFighting(): boolean {
		return this.fight !== undefined;
	}

	/**
	 * A challenge from giant `giantIndex`'s prompt. Refused while fighting,
	 * without a living body, or when that giant's ramp is still locked for this
	 * player (a client can open its own gate walls; it cannot open this check).
	 */
	public requestChallenge(giantIndex: number, returnTo: CFrame): void {
		const giant = GIANTS[giantIndex];
		if (this.fight !== undefined || giant === undefined || !this.progress.canChallenge(giantIndex)) return;

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
			giantIndex,
			arena,
			returnTo,
			phase: "Ready",
			meter: START_METER,
			struggleStartedAt: now,
			bucket: fullShoveBucket(now, SHOVE_BURST),
			surge: planSurge(now, SURGE_TIMING, 0),
			pushedUntil: now,
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

		const now = os.clock();
		fight.phase = "Struggle";
		fight.struggleStartedAt = now;
		fight.bucket = fullShoveBucket(now, SHOVE_BURST);
		fight.surge = planSurge(now + FIRST_SURGE_DELAY - SURGE_TIMING.minGap, SURGE_TIMING, math.random());
		fight.pushedUntil = now;
		this.publish(fight, true);

		const { steadyPerSecond, surgePerSecond } = splitResistance(
			fight.giant.resistancePerSecond,
			SURGE_SHARE,
			SURGE_TIMING,
		);
		fight.connections.push(
			RunService.Heartbeat.Connect(() => {
				const clock = os.clock();
				fight.meter -= resistanceBetween(fight.pushedUntil, clock, fight.surge, steadyPerSecond, surgePerSecond);
				fight.pushedUntil = clock;
				if (clock >= fight.surge.endsAt) fight.surge = planSurge(clock, SURGE_TIMING, math.random());
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
		if (outcome === "won") {
			this.wins.addWins(fight.giant.winsPayout);
			this.progress.recordWin(fight.giantIndex);
		}
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
			EncounterAttribute.Surge,
		]) {
			this.instance.SetAttribute(name, undefined);
		}
	}

	private publish(fight: Fight, force: boolean): void {
		const now = os.clock();
		const surge = fight.phase === "Struggle" ? surgeState(fight.surge, now) : undefined;
		// Surge edges go out at once, so the warning is never late to the client.
		if (!force && surge === this.instance.GetAttribute(EncounterAttribute.Surge)) {
			if (now - fight.lastPublishedAt < 1 / METER_PUBLISH_RATE) return;
		}

		fight.lastPublishedAt = now;
		this.instance.SetAttribute(EncounterAttribute.Phase, fight.phase);
		this.instance.SetAttribute(EncounterAttribute.Surge, surge);
		this.instance.SetAttribute(EncounterAttribute.Meter, math.clamp(fight.meter, 0, 1));
	}

	override destroy(): void {
		const fight = this.fight;
		if (fight !== undefined) this.end(fight, false);
		this.characterConnection?.Disconnect();
		super.destroy();
	}
}
