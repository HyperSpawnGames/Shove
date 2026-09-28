import { OnInit, Service } from "@flamework/core";
import { Workspace } from "@rbxts/services";
import { placeBody } from "server/util/place-body";
import { buildRidge } from "./ridge-builder";
import { RIDGE_CONFIG } from "./ridge-config";
import { findGiantPrefab, launchGiant, spawnGiant } from "./ridge-giants";
import { layoutRidge, RidgeLayout } from "./ridge-layout";
import { throwVelocity } from "./throw-arc";

/**
 * Owns the ridge greybox: builds it from RIDGE_CONFIG in onInit, which runs
 * before PlayerService tags anyone, so no player spawns before the world
 * (and its SpawnLocation) exists. Owns the giant standing on each terrace.
 */
@Service({})
export class RidgeService implements OnInit {
	private layout!: RidgeLayout;
	private terraceModels: readonly Model[] = [];
	/** The giant standing on each terrace's mark; absent while it is in the air. */
	private readonly giants = new Map<number, Model>();

	onInit(): void {
		this.layout = layoutRidge(RIDGE_CONFIG);
		const ridge = buildRidge(this.layout);
		ridge.folder.Parent = Workspace;
		this.terraceModels = ridge.terraces;
		for (const terrace of this.layout.terraces) {
			if (terrace.fight) this.placeGiant(terrace.index);
		}
	}

	public getLayout(): RidgeLayout {
		return this.layout;
	}

	/** Where a body's feet go on arrival at a terrace (0 is the base), facing up the ridge. */
	public arrivalCFrame(index: number): CFrame {
		const point = this.layout.terraces[index].arrivalPoint;
		return CFrame.lookAt(point, point.add(new Vector3(0, 0, 1)));
	}

	/** Stands a body at rest on a terrace's arrival point. */
	public teleport(body: Model, index: number): void {
		placeBody(body, this.arrivalCFrame(index));
		const root = body.PrimaryPart;
		if (root) {
			root.AssemblyLinearVelocity = Vector3.zero;
			root.AssemblyAngularVelocity = Vector3.zero;
		}
	}

	/**
	 * Throws terrace `index`'s giant off the +X cliff and stands a fresh one
	 * on the mark after throwResetAfter. False when no giant is standing there.
	 */
	public throwGiant(index: number): boolean {
		const giant = this.giants.get(index);
		const fight = this.layout.terraces[index]?.fight;
		if (giant === undefined || fight === undefined) return false;

		this.giants.delete(index);
		const velocity = throwVelocity(fight.throwDistance, RIDGE_CONFIG.throwAngleDegrees, Workspace.Gravity);
		launchGiant(giant, velocity, RIDGE_CONFIG.throwSpin);
		task.delay(RIDGE_CONFIG.throwResetAfter, () => {
			giant.Destroy();
			this.placeGiant(index);
		});
		return true;
	}

	private placeGiant(index: number): void {
		const prefab = findGiantPrefab(index);
		if (prefab === undefined) {
			warn(`[push-a-giant] no giant with RosterIndex ${index}; terrace ${index} stays empty`);
			return;
		}
		const giant = spawnGiant(prefab, this.layout.terraces[index], this.terraceModels[index]);
		if (giant) this.giants.set(index, giant);
	}
}
