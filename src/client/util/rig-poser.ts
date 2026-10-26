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
	| "RightKnee";

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
};

/**
 * Joint angles in degrees about the joint's own axes. X pitches: positive
 * swings a limb forward and bends a knee or elbow the way it bends, negative
 * on Root or Waist leans the body forward. Z rolls: positive swings a right
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

/** Scales every angle of a pose; 0 is the rig's rest pose. */
export function scalePose(pose: Pose, weight: number): Pose {
	const scaled: Pose = {};
	for (const [joint, angles] of pairs(pose)) scaled[joint] = angles.mul(weight);
	return scaled;
}

/**
 * Bends a rig's joints from code, on this client only, by rotating each
 * Motor6D's C0 from the value it had when the poser was made. Rotations only
 * (plus an optional Root shift for unscaled rigs), so a ScaleTo'd giant poses
 * correctly: the squared-offset problem in docs/giant-scaling.md comes from
 * the Animator's translations, and nothing here goes through the Animator.
 *
 * A stand-in for authored animations until assets exist. restore() puts the
 * rig back exactly as it was.
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
