import { SpringTuning, stepSpring } from "./spring";

/** The R15 joints a pose can bend, each named after its Motor6D. */
export type JointName =
	| "Root"
	| "Waist"
	| "Neck"
	| "LeftShoulder"
	| "RightShoulder"
	| "LeftElbow"
	| "RightElbow"
	| "LeftHip"
	| "RightHip"
	| "LeftKnee"
	| "RightKnee"
	| "LeftWrist"
	| "RightWrist"
	| "LeftAnkle"
	| "RightAnkle";

/** The part each joint's Motor6D lives in (its Part1). */
const JOINT_PARTS: Record<JointName, string> = {
	Root: "LowerTorso",
	Waist: "UpperTorso",
	Neck: "Head",
	LeftShoulder: "LeftUpperArm",
	RightShoulder: "RightUpperArm",
	LeftElbow: "LeftLowerArm",
	RightElbow: "RightLowerArm",
	LeftHip: "LeftUpperLeg",
	RightHip: "RightUpperLeg",
	LeftKnee: "LeftLowerLeg",
	RightKnee: "RightLowerLeg",
	LeftWrist: "LeftHand",
	RightWrist: "RightHand",
	LeftAnkle: "LeftFoot",
	RightAnkle: "RightFoot",
};

/**
 * Joint angles in degrees about the joint's own axes. X pitches: positive
 * swings a limb forward and bends a knee or elbow the way it bends, negative
 * on Root or Waist leans the body forward, positive on a wrist bends the palm
 * forward, negative on an ankle lifts the toes. Z rolls: positive swings a right
 * arm out to the side, negative a left one.
 */
export type Pose = Partial<Record<JointName, Vector3>>;

/** Root offsets in studs, in the root part's frame, applied before the rotation. */
export type PoseShift = Partial<Record<JointName, Vector3>>;

/** A pose from degrees, for readable pose tables. */
export function deg(x: number, y = 0, z = 0): Vector3 {
	return new Vector3(x, y, z);
}

/** Blends two poses: 0 is `from`, 1 is `to`. A joint missing from one counts as 0. */
export function mixPoses(from: Pose, to: Pose, alpha: number): Pose {
	const mixed: Pose = {};
	for (const [joint, angles] of pairs(from)) mixed[joint] = angles.Lerp(to[joint] ?? Vector3.zero, alpha);
	for (const [joint, angles] of pairs(to)) {
		if (from[joint] === undefined) mixed[joint] = Vector3.zero.Lerp(angles, alpha);
	}
	return mixed;
}

/** Layers poses: each joint's angles are the sum of its angles in every pose. */
export function addPoses(...poses: Pose[]): Pose {
	const sum: Pose = {};
	for (const pose of poses) {
		for (const [joint, angles] of pairs(pose)) sum[joint] = (sum[joint] ?? Vector3.zero).add(angles);
	}
	return sum;
}

/** Scales every angle of a pose; 0 is the rig's rest pose. */
export function scalePose(pose: Pose, weight: number): Pose {
	const scaled: Pose = {};
	for (const [joint, angles] of pairs(pose)) scaled[joint] = angles.mul(weight);
	return scaled;
}

/**
 * Bends a rig's joints from code, on this client only, by rotating each
 * Motor6D's C0 from the value it had when the poser was made. Rotations only
 * (plus an optional Root shift), so it poses a rig of any size, and it layers
 * under any animation track: the Animator writes each joint's Transform, on
 * top of the C0 set here.
 *
 * restore() puts the rig back exactly as it was.
 */
export class RigPoser {
	private readonly joints = new Map<JointName, { motor: Motor6D; rest: CFrame }>();

	constructor(public readonly rig: Model) {
		for (const [joint, partName] of pairs(JOINT_PARTS)) {
			const motor = rig.FindFirstChild(partName)?.FindFirstChild(joint);
			if (motor?.IsA("Motor6D")) this.joints.set(joint, { motor, rest: motor.C0 });
		}
	}

	/** Whether the rig has the joints of an R15 body. */
	public isR15(): boolean {
		return this.joints.has("Root") && this.joints.has("Waist");
	}

	public getMotor(joint: JointName): Motor6D | undefined {
		return this.joints.get(joint)?.motor;
	}

	/** Sets every joint: those in `pose` to their angles, the rest back to rest. */
	public apply(pose: Pose, shift?: PoseShift): void {
		for (const [joint, { motor, rest }] of this.joints) {
			const angles = pose[joint];
			const offset = shift?.[joint];
			let c0 = rest;
			if (offset !== undefined) c0 = new CFrame(offset).mul(c0);
			if (angles !== undefined) {
				c0 = c0.mul(CFrame.Angles(math.rad(angles.X), math.rad(angles.Y), math.rad(angles.Z)));
			}
			motor.C0 = c0;
		}
	}

	/** Puts every joint back where it was when the poser was made. */
	public restore(): void {
		for (const [, { motor, rest }] of this.joints) {
			if (motor.Parent !== undefined) motor.C0 = rest;
		}
	}
}

/** How each joint springs toward its pose: the torso firm, arms looser, the head loosest. */
export const JOINT_SPRINGS: Record<JointName, SpringTuning> = {
	Root: { speed: 22, damping: 0.75 },
	Waist: { speed: 18, damping: 0.55 },
	Neck: { speed: 11, damping: 0.45 },
	LeftShoulder: { speed: 17, damping: 0.45 },
	RightShoulder: { speed: 17, damping: 0.45 },
	LeftElbow: { speed: 20, damping: 0.5 },
	RightElbow: { speed: 20, damping: 0.5 },
	LeftWrist: { speed: 14, damping: 0.4 },
	RightWrist: { speed: 14, damping: 0.4 },
	// Legs stay crisp, so steps land where the feet are planted.
	LeftHip: { speed: 34, damping: 0.9 },
	RightHip: { speed: 34, damping: 0.9 },
	LeftKnee: { speed: 34, damping: 0.9 },
	RightKnee: { speed: 34, damping: 0.9 },
	LeftAnkle: { speed: 40, damping: 1 },
	RightAnkle: { speed: 40, damping: 1 },
};

/** Integration order: the torso first, so the head and arms can trail it. */
const SPRING_ORDER: JointName[] = [
	"Root",
	"Waist",
	"Neck",
	"LeftShoulder",
	"RightShoulder",
	"LeftElbow",
	"RightElbow",
	"LeftWrist",
	"RightWrist",
	"LeftHip",
	"RightHip",
	"LeftKnee",
	"RightKnee",
	"LeftAnkle",
	"RightAnkle",
];

/** Degrees of head and arm lag per degree-per-second the torso pitches and twists. */
const HEAD_LAG = 0.035;
const ARM_LAG = 0.02;

/**
 * A RigPoser whose joints ease toward each pose on springs instead of
 * jumping to it: a shove overshoots and settles, a hit wobbles, and the head
 * and arms trail behind the torso when it moves. Call step() every frame
 * with the pose the body is aiming for.
 */
export class SpringPoser {
	private readonly angles = new Map<JointName, Vector3>();
	private readonly velocities = new Map<JointName, Vector3>();

	constructor(
		public readonly poser: RigPoser,
		private readonly tuning: Record<JointName, SpringTuning> = JOINT_SPRINGS,
	) {}

	public step(target: Pose, dt: number, shift?: PoseShift): void {
		const pose: Pose = {};
		let torsoSwing = Vector3.zero;
		for (const joint of SPRING_ORDER) {
			let aim = target[joint] ?? Vector3.zero;
			if (joint === "Neck") aim = aim.sub(torsoSwing.mul(HEAD_LAG));
			else if (joint === "LeftShoulder" || joint === "RightShoulder") aim = aim.sub(torsoSwing.mul(ARM_LAG));

			const [angles, velocity] = stepSpring(
				this.angles.get(joint) ?? aim,
				this.velocities.get(joint) ?? Vector3.zero,
				aim,
				this.tuning[joint],
				dt,
			);
			this.angles.set(joint, angles);
			this.velocities.set(joint, velocity);
			if (joint === "Root" || joint === "Waist") torsoSwing = torsoSwing.add(velocity);
			pose[joint] = angles;
		}
		this.poser.apply(pose, shift);
	}

	public restore(): void {
		this.angles.clear();
		this.velocities.clear();
		this.poser.restore();
	}
}
