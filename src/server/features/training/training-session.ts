import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { Events } from "server/network";
import { PlayerCharacter } from "server/services/player/player-character";
import { PLAYER_LOADED_TAG } from "server/services/player/player-tags";
import { TrainingAttribute } from "shared/features/training/training-attributes";
import {
	BASE_ARM_STRENGTH,
	BASE_PET_MULTIPLIER,
	BASE_SECONDS_PER_REP,
	TRAINING_MAX_START_SPEED,
	TRAINING_SPOT_TOLERANCE,
} from "./training-config";
import { canStartTraining, hasLeftTrainingSpot, strengthPerRep, totalBonus } from "./training-rules";
import { StrengthStat } from "./strength-stat";

interface Session {
	/** Where the root stood when training started; walking away ends the session. */
	origin: Vector3;
	/** The pending rep. Undefined only while that rep is completing. */
	repThread?: thread;
}

/**
 * Automatic push-ups. The server owns the clock: a rep completes only after a
 * full rep of uninterrupted training, so restarting cannot earn faster, and
 * each rep re-checks that the body is alive and has not walked off.
 *
 * Publishes the Training flag and the current rates as Player attributes for
 * the HUD. Other features end a session with stop() (a giant challenge
 * starting, for one).
 */
@Component({ tag: PLAYER_LOADED_TAG })
export class TrainingSession extends BaseComponent<{}, Player> implements OnStart {
	private session?: Session;
	/** Strength other features add to every rep (a worn outline, say), by their name. */
	private readonly repBonuses = new Map<string, number>();
	private characterConnection?: RBXScriptConnection;

	constructor(
		private readonly strength: StrengthStat,
		private readonly character: PlayerCharacter,
	) {
		super();
	}

	onStart(): void {
		this.instance.SetAttribute(TrainingAttribute.Training, false);
		this.publishRates();
		// A new body (respawn after death) never inherits the old body's session.
		this.characterConnection = this.character.characterAdded.Connect(() => this.stop());
	}

	public isTraining(): boolean {
		return this.session !== undefined;
	}

	/** Strength one rep grants right now: base arm strength plus every rep bonus, times the pet multiplier. */
	public getStrengthPerRep(): number {
		return strengthPerRep(BASE_ARM_STRENGTH + totalBonus(this.repBonuses), BASE_PET_MULTIPLIER);
	}

	/**
	 * Sets the Strength a feature adds to every rep, under its own name;
	 * undefined removes it. Negative amounts and NaN are ignored.
	 */
	public setRepBonus(source: string, bonus: number | undefined): void {
		if (bonus === undefined) this.repBonuses.delete(source);
		else if (bonus >= 0) this.repBonuses.set(source, bonus);
		else return;
		this.publishRates();
	}

	/** Seconds one rep takes right now. Auras plug in here. */
	public getSecondsPerRep(): number {
		return BASE_SECONDS_PER_REP;
	}

	/** Re-sends the rates to the HUD. Call after anything that changes them. */
	public publishRates(): void {
		this.instance.SetAttribute(TrainingAttribute.StrengthPerRep, this.getStrengthPerRep());
		this.instance.SetAttribute(TrainingAttribute.SecondsPerRep, this.getSecondsPerRep());
	}

	/** The requestStartTraining intent. The server decides; invalid requests are dropped. */
	public requestStart(): void {
		const humanoid = this.getHumanoid();
		const root = humanoid?.RootPart;
		const allowed = canStartTraining({
			training: this.isTraining(),
			alive: humanoid !== undefined && humanoid.Health > 0 && root !== undefined,
			onGround: humanoid !== undefined && humanoid.FloorMaterial !== Enum.Material.Air,
			held: root?.Anchored === true,
			moving:
				root !== undefined &&
				root.AssemblyLinearVelocity.mul(new Vector3(1, 0, 1)).Magnitude > TRAINING_MAX_START_SPEED,
		});
		if (!allowed || root === undefined) return;

		this.session = { origin: root.Position };
		this.instance.SetAttribute(TrainingAttribute.Training, true);
		this.scheduleRep(this.session);
	}

	/** Ends the session, if any. The pending rep is lost, as the design says. */
	public stop(): void {
		const session = this.session;
		if (session === undefined) return;

		this.session = undefined;
		if (session.repThread !== undefined) task.cancel(session.repThread);
		this.instance.SetAttribute(TrainingAttribute.Training, false);
	}

	private scheduleRep(session: Session): void {
		session.repThread = task.delay(this.getSecondsPerRep(), () => this.completeRep(session));
	}

	private completeRep(session: Session): void {
		// This runs on the rep thread itself, which stop() must not cancel.
		session.repThread = undefined;
		if (this.session !== session) return;

		const humanoid = this.getHumanoid();
		const root = humanoid?.RootPart;
		if (
			humanoid === undefined ||
			root === undefined ||
			humanoid.Health <= 0 ||
			hasLeftTrainingSpot(session.origin, root.Position, TRAINING_SPOT_TOLERANCE)
		) {
			this.stop();
			return;
		}

		const gained = this.getStrengthPerRep();
		this.strength.addStrength(gained);
		// The popup shows what the HUD total rose by: the gain times every multiplier.
		Events.trainingRepCompleted.fire(this.instance, gained * this.strength.getMultiplier());
		this.scheduleRep(session);
	}

	private getHumanoid(): Humanoid | undefined {
		return this.character.getCharacter()?.FindFirstChildOfClass("Humanoid");
	}

	override destroy(): void {
		this.stop();
		this.characterConnection?.Disconnect();
		super.destroy();
	}
}
