import { ServerStorage } from "@rbxts/services";
import type { GiantDefinition } from "./giants";

/**
 * A fresh, anchored, scaled copy of a giant's prefab, or undefined when the
 * prefab is missing. No animation plays on it: a ScaleTo'd rig animates with
 * squared joint offsets (docs/giant-scaling.md), and a still rig avoids that.
 */
export function cloneGiant(giant: GiantDefinition): Model | undefined {
	const prefab = ServerStorage.FindFirstChild("Giants")?.FindFirstChild(giant.modelId);
	if (!prefab?.IsA("Model")) {
		warn(`[push-a-giant] giant prefab ServerStorage.Giants.${giant.modelId} is missing`);
		return undefined;
	}

	const model = prefab.Clone();
	model.ScaleTo(giant.scale);

	const humanoid = model.FindFirstChildOfClass("Humanoid");
	if (humanoid) {
		humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None;
		humanoid.HealthDisplayType = Enum.HumanoidHealthDisplayType.AlwaysOff;
	}
	for (const part of model.GetDescendants()) {
		if (part.IsA("BasePart")) part.Anchored = true;
	}
	return model;
}

/** Pivots a model to `floor`, then lifts or lowers it until its lowest point touches the floor's height. */
export function placeOnFloor(model: Model, floor: CFrame): void {
	model.PivotTo(floor);
	const [box, size] = model.GetBoundingBox();
	const bottom = box.Position.Y - size.Y / 2;
	model.PivotTo(floor.add(new Vector3(0, floor.Position.Y - bottom, 0)));
}
