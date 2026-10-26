import { deg, Pose } from "client/util/rig-poser";

/** What a fighter's body is doing this frame; every field runs 0..1 unless noted. */
export interface StrainState {
	/** Seconds on a clock, for the tremor and breathing. */
	time: number;
	/** -1..1: how far this fighter is winning. */
	lead: number;
	/** A shove this fighter just threw, decaying. */
	shove: number;
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
 * leg bent, back leg braced. Shoves extend the arms, hits fold them and rock
 * the body back, and the closer the fight the harder the arms shake.
 */
export function strainPose(state: StrainState): Pose {
	const { time, lead, shove, hit, windup, lunge } = state;
	const strain = 0.5 + 0.5 * (1 - math.abs(lead));
	const shake = tremor(time, 34) * 2.5 * strain;
	const breath = math.sin(time * 3.2) * 1.5;

	const lean = -10 - 7 * shove + 12 * hit + 16 * windup - 18 * lunge;
	const arms = 76 + 16 * shove - 22 * hit - 34 * windup + 24 * lunge;
	const elbows = 32 - 28 * shove + 26 * hit + 48 * windup - 30 * lunge;

	return {
		Root: deg(lean * 0.5),
		Waist: deg(lean - 6 * lead + breath + shake * 0.4),
		Neck: deg(12 + 8 * hit - 8 * windup),
		RightShoulder: deg(arms + shake, 0, -7),
		LeftShoulder: deg(arms - shake, 0, 7),
		RightElbow: deg(elbows),
		LeftElbow: deg(elbows),
		// Right leg forward and bent, left braced behind; the hips undo half the lean.
		RightHip: deg(30 - lean * 0.5),
		LeftHip: deg(-12 - lean * 0.5),
		RightKnee: deg(-38 - 10 * hit),
		LeftKnee: deg(-8),
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
		RightHip: deg(40 * kick),
		LeftHip: deg(-40 * kick),
		RightKnee: deg(-30),
		LeftKnee: deg(-50),
	};
}
