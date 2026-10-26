import { Controller, OnStart } from "@flamework/core";
import { CollectionService, RunService, Workspace } from "@rbxts/services";
import { mixPoses, RigPoser, SpringPoser } from "client/util/rig-poser";
import { LOBBY_GIANT_TAG } from "shared/features/encounter/encounter-attributes";
import { flexPose, idlePose } from "./giant-idle-poses";

/** Giants farther than this from the camera are left still. */
const ANIMATE_DISTANCE = 300;
/** Seconds between flexes, and how long one lasts. */
const FLEX_EVERY = 7;
const FLEX_SECONDS = 1.6;

interface IdleGiant {
	poser: SpringPoser;
	/** Offsets this giant's rhythm so a row of giants never moves in step. */
	phase: number;
}

/**
 * Keeps the giants on the staircase alive: they breathe, look around and now
 * and then flex. Local to each client and stopped when out of view. Streaming
 * adds and removes the models, so each is picked up as it arrives.
 */
@Controller({})
export class LobbyGiantsController implements OnStart {
	private readonly giants = new Map<Model, IdleGiant>();

	onStart(): void {
		CollectionService.GetInstanceAddedSignal(LOBBY_GIANT_TAG).Connect((instance) => this.add(instance));
		CollectionService.GetInstanceRemovedSignal(LOBBY_GIANT_TAG).Connect((instance) => {
			if (instance.IsA("Model")) this.giants.delete(instance);
		});
		for (const instance of CollectionService.GetTagged(LOBBY_GIANT_TAG)) this.add(instance);

		RunService.RenderStepped.Connect((dt) => this.step(dt));
	}

	private add(instance: Instance): void {
		if (!instance.IsA("Model") || this.giants.has(instance)) return;
		const rig = new RigPoser(instance);
		if (!rig.isR15()) return;
		const poser = new SpringPoser(rig);
		this.giants.set(instance, { poser, phase: math.random() * 10 });
	}

	private step(dt: number): void {
		const camera = Workspace.CurrentCamera;
		if (camera === undefined) return;
		const now = os.clock();

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
		}
	}
}
