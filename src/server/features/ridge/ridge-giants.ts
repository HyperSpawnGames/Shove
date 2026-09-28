import { ServerStorage } from "@rbxts/services";
import { placeBody } from "server/util/place-body";
import { addLabel } from "./ridge-builder";
import { Terrace } from "./ridge-layout";

/** The roster prefab with this RosterIndex in ServerStorage.Giants, if present. */
export function findGiantPrefab(rosterIndex: number): Model | undefined {
	const giants = ServerStorage.FindFirstChild("Giants");
	for (const child of giants?.GetChildren() ?? []) {
		if (child.IsA("Model") && child.GetAttribute("RosterIndex") === rosterIndex) return child;
	}
	return undefined;
}

/**
 * Clones a giant onto a terrace's mark (docs/giant-scaling.md §2.2): sized
 * with ScaleTo to the fight's giant height, facing the player at −X, and
 * anchored at the root so it holds its rest pose. It plays no animation, so
 * it needs no Transform fix-up.
 */
export function spawnGiant(prefab: Model, terrace: Terrace, parent: Instance): Model | undefined {
	const fight = terrace.fight;
	const root = prefab.PrimaryPart;
	const height = prefab.GetAttribute("Height");
	if (fight === undefined || root === undefined || !typeIs(height, "number")) {
		warn(`[push-a-giant] giant ${prefab.Name} has no root or Height; terrace ${terrace.index} stays empty`);
		return undefined;
	}

	const giant = prefab.Clone();
	giant.Name = "Giant";
	giant.ModelStreamingMode = Enum.ModelStreamingMode.Persistent;
	giant.PrimaryPart!.Anchored = true;
	giant.Parent = parent;
	giant.ScaleTo(fight.giantHeight / height);
	const mark = fight.giantMark;
	placeBody(giant, CFrame.lookAt(mark, mark.sub(new Vector3(1, 0, 0))));

	const head = giant.FindFirstChild("Head");
	if (head?.IsA("BasePart")) {
		const name = giant.GetAttribute("DisplayName") ?? prefab.Name;
		const text =
			`${terrace.index}. ${name}\n` +
			`player ${string.format("%.2f", terrace.arrivalScale)}× · giant ${string.format("%.0f", fight.giantHeight)} studs`;
		addLabel(head, text, 0.2 * fight.giantHeight, 0.3 * fight.giantHeight);
	}
	return giant;
}

/**
 * Throws a giant: unanchors it under server physics, limp (PlatformStand, no
 * animation), with a launch velocity and a tumble toward the +X cliff.
 */
export function launchGiant(giant: Model, velocity: Vector3, spin: number): void {
	const root = giant.PrimaryPart;
	if (root === undefined) return;
	const humanoid = giant.FindFirstChildOfClass("Humanoid");
	if (humanoid) humanoid.PlatformStand = true;
	root.Anchored = false;
	root.SetNetworkOwner(undefined);
	root.AssemblyLinearVelocity = velocity;
	// Negative about Z tips the head toward +X.
	root.AssemblyAngularVelocity = new Vector3(0, 0, -spin);
}
