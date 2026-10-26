/** The R15 joints the sumo pose bends, and how: leaning in with both arms out. */
const POSE: { part: string; motor: string; rotation: CFrame }[] = [
	{ part: "LowerTorso", motor: "Root", rotation: CFrame.Angles(math.rad(-18), 0, 0) },
	{ part: "UpperTorso", motor: "Waist", rotation: CFrame.Angles(math.rad(-10), 0, 0) },
	{ part: "RightUpperArm", motor: "RightShoulder", rotation: CFrame.Angles(math.rad(80), 0, math.rad(-8)) },
	{ part: "LeftUpperArm", motor: "LeftShoulder", rotation: CFrame.Angles(math.rad(80), 0, math.rad(8)) },
	{ part: "RightLowerArm", motor: "RightElbow", rotation: CFrame.Angles(math.rad(15), 0, 0) },
	{ part: "LeftLowerArm", motor: "LeftElbow", rotation: CFrame.Angles(math.rad(15), 0, 0) },
];

/**
 * Bends a rig into the shove pose on this client only, and returns a function
 * that puts it back. Joints a rig lacks (R6) are skipped. A stand-in until a
 * shove animation asset exists.
 */
export function applyShovePose(rig: Model): () => void {
	const restored: [Motor6D, CFrame][] = [];
	for (const joint of POSE) {
		const motor = rig.FindFirstChild(joint.part)?.FindFirstChild(joint.motor);
		if (!motor?.IsA("Motor6D")) continue;
		restored.push([motor, motor.C0]);
		motor.C0 = motor.C0.mul(joint.rotation);
	}
	return () => {
		for (const [motor, c0] of restored) {
			if (motor.Parent !== undefined) motor.C0 = c0;
		}
	};
}
