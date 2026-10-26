import { deg, Pose } from "client/util/rig-poser";

/** Breathing, a slow look around, a slight sway. */
export function idlePose(time: number): Pose {
	const breath = math.sin(time * 1.7);
	return {
		Waist: deg(2 * breath, 10 * math.sin(time * 0.35)),
		Neck: deg(-4 + 3 * math.sin(time * 0.6), 25 * math.sin(time * 0.45)),
		RightShoulder: deg(4 * breath, 0, 6 + 3 * breath),
		LeftShoulder: deg(4 * breath, 0, -6 - 3 * breath),
		RightElbow: deg(12),
		LeftElbow: deg(12),
	};
}

/** Arms out and curled up: a double-biceps flex at the challenger. */
export function flexPose(time: number): Pose {
	const squeeze = math.sin(time * 14) * 4;
	return {
		Waist: deg(-6),
		Neck: deg(-8),
		RightShoulder: deg(10, 0, 85 + squeeze),
		LeftShoulder: deg(10, 0, -85 - squeeze),
		RightElbow: deg(0, 0, 100 + squeeze),
		LeftElbow: deg(0, 0, -100 - squeeze),
	};
}
