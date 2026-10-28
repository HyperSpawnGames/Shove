import { Controller, OnStart } from "@flamework/core";
import { CollectionService, RunService, Workspace } from "@rbxts/services";
import { lowestFootY } from "client/util/feet";
import { mixPoses, RigPoser, SpringPoser } from "client/util/rig-poser";
import { GIANT_FLOOR_ATTRIBUTE, LOBBY_GIANT_TAG } from "shared/features/encounter/encounter-attributes";
import { flexPose, idlePose } from "./giant-idle-poses";

/** Giants farther than this from the camera are left still. */
const ANIMATE_DISTANCE = 300;
/** Seconds between flexes, and how long one lasts. */
const FLEX_EVERY = 7;
const FLEX_SECONDS = 1.6;
/** The joints of a whole R15 body; fewer means it is still streaming in. */
const R15_JOINT_COUNT = 15;

interface IdleGiant {
	poser: SpringPoser;
	/** Offsets this giant's rhythm so a row of giants never moves in step. */
	phase: number;
}

/**
 * Sets a giant down so its lower foot rests on its pedestal, on this client.
 * Roblox's default idle was made for standard R15 proportions, and on a
 * chunkier rig at giant size it lifts the feet off the floor.
 */
function plantFeet(model: Model): void {
	const floor = model.GetAttribute(GIANT_FLOOR_ATTRIBUTE);
	const lowest = lowestFootY(model);
	if (!typeIs(floor, "number") || lowest === undefined) return;
	model.PivotTo(model.GetPivot().add(new Vector3(0, floor - lowest, 0)));
}

/**
 * Keeps the giants on the staircase alive: they breathe, look around and now
 * and then flex. Local to each client and stopped when out of view. Streaming
 * adds and removes the models, so each is picked up as it arrives.
 */
@Controller({})
export class LobbyGiantsController implements OnStart {
	private readonly giants = new Map<Model, IdleGiant>();
	/** Giants whose tag has arrived but whose body is still streaming in. */
	private readonly pending = new Set<Model>();

	onStart(): void {
		CollectionService.GetInstanceAddedSignal(LOBBY_GIANT_TAG).Connect((instance) => this.add(instance));
		CollectionService.GetInstanceRemovedSignal(LOBBY_GIANT_TAG).Connect((instance) => {
			if (!instance.IsA("Model")) return;
			this.giants.delete(instance);
			this.pending.delete(instance);
		});
		for (const instance of CollectionService.GetTagged(LOBBY_GIANT_TAG)) this.add(instance);

		RunService.RenderStepped.Connect((dt) => this.step(dt));
	}

	/**
	 * Starts animating a giant once its whole body has streamed in; until
	 * then it waits in `pending` and is retried every frame. A poser made from
	 * a half-streamed body would miss the joints that arrive later.
	 */
	private add(instance: Instance): void {
		if (!instance.IsA("Model") || this.giants.has(instance)) return;
		let joints = 0;
		for (const descendant of instance.GetDescendants()) {
			if (descendant.IsA("Motor6D") || descendant.IsA("AnimationConstraint")) joints += 1;
		}
		const rig = joints >= R15_JOINT_COUNT ? new RigPoser(instance) : undefined;
		if (rig === undefined || !rig.isR15()) {
			this.pending.add(instance);
			return;
		}
		this.pending.delete(instance);
		this.giants.set(instance, { poser: new SpringPoser(rig), phase: math.random() * 10 });
	}

	private step(dt: number): void {
		const camera = Workspace.CurrentCamera;
		if (camera === undefined) return;
		const now = os.clock();
		for (const model of this.pending) this.add(model);

		for (const [model, giant] of this.giants) {
			if (model.Parent === undefined) {
				this.giants.delete(model);
				continue;
			}
			if (model.GetPivot().Position.sub(camera.CFrame.Position).Magnitude > ANIMATE_DISTANCE) continue;

			const time = now + giant.phase;
			const intoFlex = time % FLEX_EVERY;
			// A half sine in and out of the flex; the square root holds it near full in the middle.
			const flex = intoFlex < FLEX_SECONDS ? math.sin((intoFlex / FLEX_SECONDS) * math.pi) ** 0.5 : 0;
			giant.poser.step(mixPoses(idlePose(time), flexPose(time), flex), dt);
			plantFeet(model);
		}
	}
}
