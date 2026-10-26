import { deg, Pose, RigPoser } from "client/util/rig-poser";

/** Elbow bend at the bottom of a rep, in degrees. */
const BOTTOM_BEND = 80;
/** Depth samples solved up front; frames interpolate between them. */
const SAMPLES = 10;

interface Sample {
	/** Body tilt forward from vertical, degrees. */
	tilt: number;
	/** Elbow bend, degrees. */
	bend: number;
	/** How far the Root joint drops so the feet reach the floor, studs. */
	drop: number;
}

function motor(rig: Model, part: string, name: string): Motor6D | undefined {
	const found = rig.FindFirstChild(part)?.FindFirstChild(name);
	return found?.IsA("Motor6D") ? found : undefined;
}

/** A joint's Part0-to-Part1 offset with no animation applied. */
function link(joint: Motor6D): CFrame {
	return joint.C0.mul(joint.C1.Inverse());
}

/**
 * A push-up worked out from the rig's own measurements, so it fits any R15
 * body. The body pivots forward at the hips into a plank; its tilt is solved
 * so the hands, straight below the shoulders, and the feet both touch the
 * floor, at every depth from arms straight to elbows bent. The Root joint
 * drops to bring the plank to the floor while the root part stays standing,
 * so the humanoid keeps its footing and only the drawn body moves.
 */
export class PushUpPose {
	private readonly samples: Sample[];

	private constructor(
		private readonly poser: RigPoser,
		samples: Sample[],
	) {
		this.samples = samples;
	}

	/** Measures `character`, or undefined when it is not a complete R15 body. */
	public static measure(character: Model, poser: RigPoser): PushUpPose | undefined {
		const humanoid = character.FindFirstChildOfClass("Humanoid");
		const root = humanoid?.RootPart;
		const joints = {
			root: motor(character, "LowerTorso", "Root"),
			waist: motor(character, "UpperTorso", "Waist"),
			shoulder: motor(character, "RightUpperArm", "RightShoulder"),
			elbow: motor(character, "RightLowerArm", "RightElbow"),
			wrist: motor(character, "RightHand", "RightWrist"),
			hip: motor(character, "RightUpperLeg", "RightHip"),
			knee: motor(character, "RightLowerLeg", "RightKnee"),
			ankle: motor(character, "RightFoot", "RightAnkle"),
		};
		const hand = character.FindFirstChild("RightHand");
		const foot = character.FindFirstChild("RightFoot");
		for (const [, joint] of pairs(joints)) if (joint === undefined) return undefined;
		if (humanoid === undefined || root === undefined || !hand?.IsA("BasePart") || !foot?.IsA("BasePart")) {
			return undefined;
		}

		// Everything below is in the LowerTorso's frame at rest.
		const upperTorso = link(joints.waist!);
		const shoulderAt = upperTorso.mul(joints.shoulder!.C0).Position;
		const upperArm = upperTorso.mul(link(joints.shoulder!));
		const elbowAt = upperArm.mul(joints.elbow!.C0).Position;
		const lowerArm = upperArm.mul(link(joints.elbow!));
		const handBottom = lowerArm.mul(link(joints.wrist!)).mul(new Vector3(0, -hand.Size.Y / 2, 0));
		// The toe's bottom edge: tilted into a plank, the foot rests on it.
		const footBottom = link(joints.hip!)
			.mul(link(joints.knee!))
			.mul(link(joints.ankle!))
			.mul(new Vector3(0, -foot.Size.Y / 2, -foot.Size.Z / 2));
		const pivot = joints.root!.C1.Position;

		const upperLength = elbowAt.sub(shoulderAt).Magnitude;
		const foreLength = handBottom.sub(elbowAt).Magnitude;
		const shoulder = shoulderAt.sub(pivot);
		const feet = footBottom.sub(pivot);
		// The floor and the Root joint, in the root part's frame.
		const floorY = -(humanoid.HipHeight + root.Size.Y / 2);
		const pivotY = joints.root!.C0.Position.Y;

		/** Height of a point (relative to the pivot) once the body tilts forward by `tilt` radians. */
		const heightAfterTilt = (point: Vector3, tilt: number) => point.Y * math.cos(tilt) + point.Z * math.sin(tilt);

		const samples: Sample[] = [];
		for (let i = 0; i <= SAMPLES; i++) {
			const bend = (BOTTOM_BEND * i) / SAMPLES;
			// Upper arm angled back by the bend, forearm straight down to the floor.
			const reach = upperLength * math.cos(math.rad(bend)) + foreLength;
			let bestTilt = 0;
			let bestMiss = math.huge;
			for (let tiltDeg = 0; tiltDeg <= 88; tiltDeg += 0.5) {
				const tilt = math.rad(tiltDeg);
				const miss = math.abs(heightAfterTilt(shoulder, tilt) - heightAfterTilt(feet, tilt) - reach);
				if (miss < bestMiss) {
					bestMiss = miss;
					bestTilt = tiltDeg;
				}
			}
			const drop = floorY - pivotY - heightAfterTilt(feet, math.rad(bestTilt));
			samples.push({ tilt: bestTilt, bend, drop });
		}
		return new PushUpPose(poser, samples);
	}

	/**
	 * Poses the body `depth` of the way down (0 arms straight, 1 at the
	 * bottom), blended `weight` of the way from standing.
	 */
	public apply(depth: number, weight: number): void {
		const position = math.clamp(depth, 0, 1) * SAMPLES;
		const below = this.samples[math.floor(position)];
		const above = this.samples[math.min(math.floor(position) + 1, SAMPLES)];
		const t = position - math.floor(position);
		const tilt = (below.tilt + (above.tilt - below.tilt) * t) * weight;
		const bend = (below.bend + (above.bend - below.bend) * t) * weight;
		const drop = (below.drop + (above.drop - below.drop) * t) * weight;

		const pose: Pose = {
			Root: deg(-tilt),
			// Lift the head to look ahead rather than at the floor.
			Neck: deg(math.min(tilt * 0.6, 45)),
			RightShoulder: deg(tilt - bend, 0, -4 * weight),
			LeftShoulder: deg(tilt - bend, 0, 4 * weight),
			RightElbow: deg(bend),
			LeftElbow: deg(bend),
		};
		this.poser.apply(pose, { Root: new Vector3(0, drop, 0) });
	}

	public restore(): void {
		this.poser.restore();
	}
}
