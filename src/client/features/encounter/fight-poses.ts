import { deg, Pose } from "client/util/rig-poser";

/** What a fighter's body is doing this frame; every field runs 0..1 unless noted. */
export interface StrainState {
	/** Seconds on a clock, for the tremor and breathing. */
	time: number;
	/** -1..1: how far this fighter is winning. */
	lead: number;
	/** A shove this fighter just threw, decaying. */
	shove: number;
	/** Which hand threw it: 1 the right, -1 the left. Shoves alternate, sumo-style. */
	thrustSide: number;
	/** A hit this fighter just took, decaying: the giant's surge on the player, a shove on the giant. */
	hit: number;
	/** Coiling back before a surge (the giant only). */
	windup: number;
	/** Lunging in a surge (the giant only). */
	lunge: number;
}

function tremor(time: number, speed: number): number {
	return math.sin(time * speed) * 0.6 + math.sin(time * speed * 1.43 + 1.7) * 0.4;
}

/**
 * The sumo stance: leaning into the other fighter with both arms out, front
 * leg bent, back leg braced. Each shove is a one-handed thrust, the torso
 * twisting behind it while the other hand pulls back to load the next. A
 * hit folds the arms and rocks the body back. The surge wind-up raises the
 * front knee for a stomp and draws both arms back; the lunge slams the foot
 * down and drives both arms through. The closer the fight, the harder the
 * arms shake.
 */
export function strainPose(state: StrainState): Pose {
	const { time, lead, shove, thrustSide, hit, windup, lunge } = state;
	const strain = 0.5 + 0.5 * (1 - math.abs(lead));
	const shake = tremor(time, 34) * 2.5 * strain;
	const breath = math.sin(time * 3.2) * 1.5;

	const rightThrust = thrustSide > 0 ? shove : -0.4 * shove;
	const leftThrust = thrustSide < 0 ? shove : -0.4 * shove;
	const arm = (thrust: number) => 76 + 26 * thrust - 22 * hit - 34 * windup + 24 * lunge;
	const elbow = (thrust: number) => math.max(32 - 40 * thrust + 26 * hit + 48 * windup - 30 * lunge, 0);
	// Palms flat on the opponent, pressed harder behind a thrust; loose when coiled or hit.
	const wrist = (thrust: number) => (40 + 25 * thrust - 30 * hit) * (1 - windup) + 20 * lunge;

	const lean = -10 - 5 * shove + 12 * hit + 16 * windup - 18 * lunge;
	const twist = 16 * shove * thrustSide;
	// Front leg: planted and bent, lifted high in the wind-up, stamped forward in the lunge.
	const frontHip = 30 + 50 * windup - 8 * lunge;
	const frontKnee = -38 - 10 * hit - 60 * windup;

	return {
		Root: deg(lean * 0.5),
		Waist: deg(lean - 6 * lead + breath + shake * 0.4, twist),
		Neck: deg(12 + 8 * hit - 8 * windup, -twist * 0.5),
		RightShoulder: deg(arm(rightThrust) + shake, 0, -7),
		LeftShoulder: deg(arm(leftThrust) - shake, 0, 7),
		RightElbow: deg(elbow(rightThrust)),
		LeftElbow: deg(elbow(leftThrust)),
		// A quarter turn about each forearm faces the palm at the opponent, fingers up.
		RightWrist: deg(wrist(rightThrust), 90),
		LeftWrist: deg(wrist(leftThrust), -90),
		// The hips undo half the lean, so the legs stay under the body.
		RightHip: deg(frontHip - lean * 0.5),
		LeftHip: deg(-12 - lean * 0.5 + 6 * windup),
		RightKnee: deg(frontKnee),
		LeftKnee: deg(-8 - 12 * windup),
	};
}

/**
 * A stepping cycle to layer on the stance, so a fighter moved by the meter
 * walks rather than slides. `phase` advances with distance travelled (half a
 * cycle per step), so the feet keep pace with the body whichever way it goes;
 * `amount` fades the steps in with speed. Each leg lifts its knee while it
 * swings, forward or back.
 */
export function stepPose(phase: number, amount: number): Pose {
	if (amount <= 0) return {};
	const swing = math.sin(phase) * 24 * amount;
	const rightLift = math.max(0, math.cos(phase)) * 45 * amount;
	// The braced back leg starts behind the body, so it needs more knee to clear the floor.
	const leftLift = math.max(0, -math.cos(phase)) * 70 * amount;
	// The hips roll the weight onto the planted leg; the chest rolls back to stay level.
	const roll = math.sin(phase) * 5 * amount;
	return {
		Root: deg(0, 0, roll),
		Waist: deg(0, -swing * 0.25, -roll * 0.6),
		RightHip: deg(swing + rightLift * 0.5, 0, -roll),
		LeftHip: deg(-swing + leftLift * 0.6, 0, -roll),
		RightKnee: deg(-rightLift),
		LeftKnee: deg(-leftLift),
	};
}

/**
 * Sets both ankles so each foot lies flat however the hips, knees and body
 * lean have swung the leg, instead of tipping onto a heel or toe.
 */
export function withFlatFeet(pose: Pose): Pose {
	const root = pose.Root ?? Vector3.zero;
	const flat = (hip: Vector3 | undefined, knee: Vector3 | undefined) => {
		const legPitch = root.X + (hip?.X ?? 0) + (knee?.X ?? 0);
		const legRoll = root.Z + (hip?.Z ?? 0);
		return deg(-legPitch, 0, -legRoll);
	};
	return {
		...pose,
		RightAnkle: flat(pose.RightHip, pose.RightKnee),
		LeftAnkle: flat(pose.LeftHip, pose.LeftKnee),
	};
}

/**
 * Being driven backward faster than the feet can manage: the body tips back
 * and the arms fly out for balance. Layer it on the stance with `amount` 0..1.
 */
export function stumblePose(time: number, amount: number): Pose {
	if (amount <= 0) return {};
	const windmill = math.sin(time * 13) * 25;
	return {
		Root: deg(8 * amount),
		Waist: deg(14 * amount),
		Neck: deg(-10 * amount),
		RightShoulder: deg((-30 + windmill) * amount, 0, 55 * amount),
		LeftShoulder: deg((-30 - windmill) * amount, 0, -55 * amount),
		RightElbow: deg(20 * amount),
		LeftElbow: deg(20 * amount),
	};
}

/** The winner after the throw: both arms up, chest out, a little bounce. */
export function victoryPose(time: number): Pose {
	const pump = math.sin(time * 9) * 12;
	return {
		Waist: deg(10),
		Neck: deg(-12),
		RightShoulder: deg(160 + pump, 0, 18),
		LeftShoulder: deg(160 - pump, 0, -18),
		RightElbow: deg(20 + pump),
		LeftElbow: deg(20 - pump),
	};
}

/** The loser in the air: limbs windmilling. */
export function flailPose(time: number): Pose {
	const swing = math.sin(time * 16);
	const kick = math.sin(time * 12 + 1);
	return {
		Waist: deg(15 * swing),
		Neck: deg(25),
		RightShoulder: deg(120 + 70 * swing, 0, 40),
		LeftShoulder: deg(120 - 70 * swing, 0, -40),
		RightElbow: deg(30),
		LeftElbow: deg(30),
		RightWrist: deg(35 * swing),
		LeftWrist: deg(-35 * swing),
		RightHip: deg(40 * kick),
		LeftHip: deg(-40 * kick),
		RightKnee: deg(-30),
		LeftKnee: deg(-50),
	};
}

/** Shoulder height as a share of a fighter's height (R15 rigs, any scale). */
const SHOULDER_SHARE = 0.8;
/** The steepest the giant angles down; past this the arms would fold into its own body. */
const MAX_REACH_DOWN = 45;

/**
 * Degrees a fighter `giantHeight` tall angles its arms down so its palms meet
 * those of a fighter `playerHeight` tall standing `distance` away on the same
 * floor: the stance is tuned for two of a size, so only the shoulders'
 * height difference needs aiming at. Never upward, never past 45.
 */
export function reachDownAngle(giantHeight: number, playerHeight: number, distance: number): number {
	const drop = (giantHeight - playerHeight) * SHOULDER_SHARE;
	if (drop <= 0) return 0;
	return math.min(math.deg(math.atan2(drop, math.max(distance, 1e-3))), MAX_REACH_DOWN);
}

/** Lowers both arms by `angle` and bends the body a quarter of it toward the opponent. */
export function reachDownPose(angle: number): Pose {
	return {
		Waist: deg(-angle * 0.25),
		RightShoulder: deg(-angle),
		LeftShoulder: deg(-angle),
	};
}
