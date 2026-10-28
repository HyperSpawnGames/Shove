import { RunService, Workspace } from "@rbxts/services";
import { pauseAnimate } from "client/util/pause-animate";
import { lowestFootY } from "client/util/feet";
import { addPoses, mixPoses, RigPoser, scalePose, SpringPoser } from "client/util/rig-poser";
import {
	ARENA_GIANT_NAME,
	ARENAS_FOLDER,
	ArenaAttribute,
	EncounterAttribute,
} from "shared/features/encounter/encounter-attributes";
import {
	CAMERA_BASE_DISTANCE,
	CAMERA_HEIGHT,
	CAMERA_SIDE_SHIFT,
	METER_SMOOTHING,
	THROW_SECONDS,
} from "./encounter-config";
import { puffDust } from "./dust";
import {
	flailPose,
	reachDownAngle,
	reachDownPose,
	stepPose,
	strainPose,
	stumblePose,
	victoryPose,
	withFlatFeet,
} from "./fight-poses";
import { approach, Stepper } from "./stepper";

/** Roblox's default R15 emotes and fall, free to play in any game. */
const CHEER_ANIMATION = "rbxassetid://507770677";
const LAUGH_ANIMATION = "rbxassetid://507770818";
const FALL_ANIMATION = "rbxassetid://507767968";

const ARENA_WAIT_SECONDS = 10;
/** Seconds to sink from standing into the stance at the start. */
const SETTLE_SECONDS = 0.6;
/** A fighter's height the poses and nudges are tuned for. */
const BASE_HEIGHT = 5.4;
/** A 1x fighter's stride, and the speed at which its steps show in full. */
const STRIDE = 1.6;
const FULL_STEP_SPEED = 2.5;

type Loser = "giant" | "player";

/** Exponential decay that does not depend on the frame rate. */
function decay(value: number, rate: number, dt: number): number {
	return value * math.exp(-rate * dt);
}

/** Plays a one-off animation on a rig's Animator, on this client. */
function playTrack(rig: Model | undefined, animationId: string, looped: boolean): AnimationTrack | undefined {
	const animator = rig?.FindFirstChildOfClass("Humanoid")?.FindFirstChildOfClass("Animator");
	if (animator === undefined) return undefined;
	const animation = new Instance("Animation");
	animation.AnimationId = animationId;
	const track = animator.LoadAnimation(animation);
	track.Looped = looped;
	track.Priority = Enum.AnimationPriority.Action;
	track.Play(0.15);
	return track;
}

/**
 * Draws one fight on this client: the camera, both fighters' poses, their
 * steps along the platform as the meter moves (feet keeping pace with the
 * body), alternating-hand thrusts, the giant's knee-up wind-up and stomping
 * lunge on every surge, the player's stumble back, dust, and the loser's
 * fall. Joints spring toward their poses, so motion overshoots and settles,
 * on top of the animation tracks both bodies play: their idles throughout,
 * a cheer or laugh for the winner and a fall for the loser. Every change here
 * is local; the arena reaches no other player, and the server decides the
 * fight from its own meter.
 */
export class FightScene {
	private stopped = false;
	private connection?: RBXScriptConnection;
	private pendingLoser?: Loser;
	private throwState?: { loser: Loser; startedAt: number; from: CFrame };

	private playerStart = new CFrame();
	private giantStart = new CFrame();
	private travel = 0;
	private giant?: Model;
	private root?: BasePart;
	private playerPoser?: SpringPoser;
	private giantPoser?: SpringPoser;
	/** Tracks this scene started on the player's own body, stopped when it ends. */
	private playerTracks: AnimationTrack[] = [];
	/** Gives the player's own idle and walk back when the fight ends. */
	private resumeAnimate?: () => void;
	/** Giant height over a player's, so its nudges and the camera scale with it. */
	private giantScale = 1;
	/** Degrees the giant angles its arms and body down, so its palms meet the player's. */
	private giantReachDown = 0;
	private cameraEye = Vector3.zero;
	private cameraFocus = Vector3.zero;
	private floorY = 0;
	private playerSteps = new Stepper(STRIDE, FULL_STEP_SPEED);
	private giantSteps = new Stepper(STRIDE, FULL_STEP_SPEED);
	/** The hand of the next thrust: 1 right, -1 left. */
	private thrustSide = 1;

	private shownMeter = 0.5;
	private settle = 0;
	private playerShove = 0;
	private playerHit = 0;
	private giantHit = 0;
	private windup = 0;
	private lunge = 0;
	private shake = 0;
	private lastSurge?: string;

	constructor(private readonly player: Player) {}

	/** Waits for the arena to stream in, then takes the camera. Yields. */
	public start(): void {
		const arena = Workspace.WaitForChild(ARENAS_FOLDER, ARENA_WAIT_SECONDS)?.WaitForChild(
			tostring(this.player.UserId),
			ARENA_WAIT_SECONDS,
		);
		const giant = arena?.WaitForChild(ARENA_GIANT_NAME, ARENA_WAIT_SECONDS);
		const character = this.player.Character;
		const root = character?.FindFirstChild("HumanoidRootPart");
		if (this.stopped || !arena?.IsA("Model") || !giant?.IsA("Model") || !root?.IsA("BasePart")) return;

		const playerStart = arena.GetAttribute(ArenaAttribute.PlayerStart);
		const giantStart = arena.GetAttribute(ArenaAttribute.GiantStart);
		const travel = arena.GetAttribute(ArenaAttribute.TravelLength);
		if (!typeIs(playerStart, "CFrame") || !typeIs(giantStart, "CFrame") || !typeIs(travel, "number")) return;

		this.playerStart = playerStart;
		this.giantStart = giantStart;
		this.travel = travel;
		this.giant = giant;
		this.root = root;
		this.shownMeter = this.serverMeter();
		this.playerPoser = new SpringPoser(new RigPoser(character!));
		// The avatar's own idle would bend the fight poses; the scene drives the body until it ends.
		this.resumeAnimate = pauseAnimate(character!);
		this.giantPoser = new SpringPoser(new RigPoser(giant));
		this.giantScale = giant.GetExtentsSize().Y / BASE_HEIGHT;
		this.giantReachDown = reachDownAngle(
			giant.GetExtentsSize().Y,
			character!.GetExtentsSize().Y,
			giantStart.Position.sub(playerStart.Position).mul(new Vector3(1, 0, 1)).Magnitude,
		);
		this.giantSteps = new Stepper(STRIDE * this.giantScale, FULL_STEP_SPEED * this.giantScale);
		const humanoid = character!.FindFirstChildOfClass("Humanoid");
		this.floorY = playerStart.Position.Y - (humanoid ? humanoid.HipHeight : 2) - root.Size.Y / 2;

		this.placeCamera(character!);
		this.connection = RunService.RenderStepped.Connect((dt) => this.step(dt));
		if (this.pendingLoser !== undefined) this.throwLoser(this.pendingLoser);
	}

	/** The local player shoved: arms snap out, the giant rocks, the camera ticks. */
	public onShove(): void {
		this.thrustSide = -this.thrustSide;
		this.playerShove = 1;
		this.giantHit = math.min(this.giantHit + 0.5, 1);
		this.shake = math.max(this.shake, 0.12);
	}

	/** Throws the loser off its cliff. Safe to call before start() has finished. */
	public throwLoser(loser: Loser): void {
		if (this.throwState !== undefined) return;
		if (this.connection === undefined) {
			this.pendingLoser = loser;
			return;
		}
		// The winner's final shove: a full extension and a hard camera hit.
		if (loser === "giant") this.playerShove = 1.4;
		else this.lunge = 1;
		this.shake = 1;
		const from = loser === "giant" ? this.giant!.GetPivot() : this.root!.CFrame;
		this.throwState = { loser, startedAt: os.clock(), from };

		const character = this.player.Character;
		if (loser === "giant") {
			const cheer = playTrack(character, CHEER_ANIMATION, true);
			if (cheer) this.playerTracks.push(cheer);
			playTrack(this.giant, FALL_ANIMATION, true);
		} else {
			playTrack(this.giant, LAUGH_ANIMATION, true);
			const fall = playTrack(character, FALL_ANIMATION, true);
			if (fall) this.playerTracks.push(fall);
		}
	}

	/** Gives back the camera and the player's pose. The server removes the arena. */
	public stop(): void {
		this.stopped = true;
		this.connection?.Disconnect();
		this.playerPoser?.restore();
		this.resumeAnimate?.();
		for (const track of this.playerTracks) track.Stop(0.2);
		this.playerTracks = [];

		const camera = Workspace.CurrentCamera;
		const humanoid = this.player.Character?.FindFirstChildOfClass("Humanoid");
		if (camera) {
			camera.CameraType = Enum.CameraType.Custom;
			if (humanoid) camera.CameraSubject = humanoid;
		}
	}

	private serverMeter(): number {
		const meter = this.player.GetAttribute(EncounterAttribute.Meter);
		return typeIs(meter, "number") ? meter : 0.5;
	}

	private step(dt: number): void {
		const now = os.clock();
		this.shownMeter += (this.serverMeter() - this.shownMeter) * math.min(1, dt * METER_SMOOTHING);
		this.updateSurge(dt);
		this.settle = approach(this.settle, 1, dt / SETTLE_SECONDS);
		this.playerShove = decay(this.playerShove, 9, dt);
		this.playerHit = decay(this.playerHit, 3.5, dt);
		this.giantHit = decay(this.giantHit, 7, dt);
		this.shake = decay(this.shake, 5, dt);

		const axis = this.playerStart.LookVector;
		const offset = axis.mul((this.shownMeter - 0.5) * 2 * this.travel);
		const lead = (this.shownMeter - 0.5) * 2;

		// Small body nudges on top of the meter: shoves lunge in, hits knock back.
		const playerNudge = axis.mul(0.35 * this.playerShove - 0.6 * this.playerHit);
		const giantNudge = axis.mul((0.5 * this.giantHit + 0.4 * this.windup - 1.1 * this.lunge) * this.giantScale);

		const thrown = this.throwState;
		const throwTime = thrown ? math.min(now - thrown.startedAt, THROW_SECONDS) : 0;
		const playerAt = this.playerStart.add(offset).add(playerNudge);
		const giantAt = this.giantStart.add(offset).add(giantNudge);
		this.playerSteps.update(playerAt.Position, axis, dt);
		this.giantSteps.update(giantAt.Position, axis.mul(-1), dt);
		this.dustFootfalls();

		// Pose first, then set each body down so its lower foot rests on the floor:
		// whatever the legs are doing (a stride, the stomp, a stumble), no foot
		// sinks in or hovers.
		this.poseFighters(now, dt, lead, thrown, throwTime);
		if (thrown?.loser !== "player") {
			this.root!.CFrame = playerAt;
			this.root!.CFrame = playerAt.add(new Vector3(0, -this.footClearance(this.player.Character), 0));
		}
		if (thrown?.loser !== "giant") {
			this.giant!.PivotTo(giantAt);
			this.giant!.PivotTo(giantAt.add(new Vector3(0, -this.footClearance(this.giant), 0)));
		}
		if (thrown) this.flyLoser(thrown, throwTime, axis);
		this.moveCamera(offset, thrown);
	}

	/** Follows the server's surge flag: coil on the warning, lunge on the push. */
	private updateSurge(dt: number): void {
		const surge = this.player.GetAttribute(EncounterAttribute.Surge);
		if (surge === "Push" && this.lastSurge !== "Push") {
			this.playerHit = 1;
			this.shake = math.max(this.shake, 0.8);
			// The stomp lands and the player skids back.
			this.puffAtFoot(this.giant!, "RightFoot", this.giantScale, 24);
			this.puffAtFoot(this.player.Character, "LeftFoot", 1, 10);
		}
		this.lastSurge = typeIs(surge, "string") ? surge : undefined;
		this.windup = approach(this.windup, surge === "Warn" ? 1 : 0, dt * (surge === "Warn" ? 1.6 : 6));
		this.lunge = approach(this.lunge, surge === "Push" ? 1 : 0, dt * (surge === "Push" ? 12 : 3));
	}

	/** How far a rig's lower foot sits above the floor; negative when it is sunk in. */
	private footClearance(rig: Model | undefined): number {
		const lowest = lowestFootY(rig);
		return lowest === undefined ? 0 : lowest - this.floorY;
	}

	/** Small puffs under the giant's feet as its steps land; it is heavy. */
	private dustFootfalls(): void {
		const falls = this.giantSteps.takeFootfalls();
		this.playerSteps.takeFootfalls();
		if (falls > 0 && this.giantSteps.amount > 0.4 && this.throwState === undefined) {
			this.puffAtFoot(this.giant!, math.random() < 0.5 ? "RightFoot" : "LeftFoot", this.giantScale, 5);
		}
	}

	private puffAtFoot(rig: Model | undefined, footName: string, size: number, count: number): void {
		const foot = rig?.FindFirstChild(footName);
		if (!foot?.IsA("BasePart")) return;
		puffDust(new Vector3(foot.Position.X, this.floorY + 0.3, foot.Position.Z), size, count);
	}

	private flyLoser(thrown: { loser: Loser; from: CFrame }, time: number, axis: Vector3): void {
		const flight = thrown.loser === "giant" ? axis : axis.mul(-1);
		const size = thrown.loser === "giant" ? this.giantScale : 1;
		const travel = flight.mul(16 * size * time).add(new Vector3(0, 10 * size * time - 34 * time * time, 0));
		const moved = thrown.from.add(travel).mul(CFrame.Angles(time * 4.5, 0, time * 1.5));
		if (thrown.loser === "giant") this.giant!.PivotTo(moved);
		else this.root!.CFrame = moved;
	}

	private poseFighters(
		now: number,
		dt: number,
		lead: number,
		thrown: { loser: Loser } | undefined,
		throwTime: number,
	): void {
		let playerPose = strainPose({
			time: now,
			lead,
			shove: math.min(this.playerShove, 1),
			thrustSide: this.thrustSide,
			hit: this.playerHit,
			windup: 0,
			lunge: 0,
		});
		let giantPose = addPoses(
			strainPose({
				time: now + 0.7,
				lead: -lead,
				shove: 0,
				thrustSide: 1,
				hit: this.giantHit,
				windup: this.windup,
				lunge: this.lunge,
			}),
			reachDownPose(this.giantReachDown),
		);

		playerPose = addPoses(
			playerPose,
			stepPose(this.playerSteps.phase, this.playerSteps.amount),
			stumblePose(now, this.playerSteps.backward),
		);
		giantPose = addPoses(
			giantPose,
			stepPose(this.giantSteps.phase, this.giantSteps.amount),
			stumblePose(now, this.giantSteps.backward * 0.5),
		);

		playerPose = withFlatFeet(playerPose);
		giantPose = withFlatFeet(giantPose);

		if (thrown) {
			// The cheer, laugh and fall tracks carry most of the result; the code
			// pose only leans into them.
			const blend = math.min(throwTime / 0.25, 1);
			const celebrate = scalePose(victoryPose(now), 0.35);
			const tumble = scalePose(flailPose(now), 0.5);
			if (thrown.loser === "giant") {
				playerPose = mixPoses(playerPose, celebrate, blend);
				giantPose = mixPoses(giantPose, tumble, blend);
			} else {
				giantPose = mixPoses(giantPose, celebrate, blend);
				playerPose = mixPoses(playerPose, tumble, blend);
			}
		}

		this.playerPoser!.step(scalePose(playerPose, this.settle), dt);
		this.giantPoser!.step(scalePose(giantPose, this.settle), dt);
	}

	private placeCamera(character: Model): void {
		const giantHeight = this.giant!.GetExtentsSize().Y;
		const characterHeight = character.GetExtentsSize().Y;
		const axis = this.playerStart.LookVector;
		const side = axis.Cross(new Vector3(0, 1, 0));
		const middle = this.playerStart.Position.Lerp(this.giantStart.Position, 0.5);
		const floorY = this.playerStart.Position.Y - characterHeight / 2;
		const distance = CAMERA_BASE_DISTANCE + giantHeight * 1.2;

		this.cameraFocus = new Vector3(middle.X, floorY + giantHeight * 0.45, middle.Z);
		this.cameraEye = this.cameraFocus
			.add(side.mul(distance))
			.sub(axis.mul(distance * CAMERA_SIDE_SHIFT))
			.add(new Vector3(0, CAMERA_HEIGHT, 0));

		const camera = Workspace.CurrentCamera;
		if (camera === undefined) return;
		camera.CameraType = Enum.CameraType.Scriptable;
		camera.CFrame = CFrame.lookAt(this.cameraEye, this.cameraFocus);
	}

	/** Drifts with the fight, turns to watch the loser fall, and shakes on impacts. */
	private moveCamera(offset: Vector3, thrown: { loser: Loser } | undefined): void {
		const camera = Workspace.CurrentCamera;
		if (camera === undefined) return;

		let focus = this.cameraFocus.add(offset.mul(0.4));
		if (thrown) {
			const loserAt = thrown.loser === "giant" ? this.giant!.GetPivot().Position : this.root!.Position;
			focus = focus.Lerp(loserAt, 0.35);
		}
		const eye = this.cameraEye.add(offset.mul(0.4));
		const jitter = this.shake * 0.6;
		const wobble = CFrame.Angles(
			math.rad((math.random() - 0.5) * jitter * 3),
			math.rad((math.random() - 0.5) * jitter * 3),
			math.rad((math.random() - 0.5) * jitter * 2),
		);
		camera.CFrame = CFrame.lookAt(eye, focus).mul(wobble);
	}
}
