/**
 * The root CFrame that stands a humanoid body's feet on `feet`, keeping its
 * orientation: the root's centre sits HipHeight plus half its own height
 * above the ground.
 */
export function rootCFrameForFeet(feet: CFrame, hipHeight: number, rootHeight: number): CFrame {
	return feet.add(new Vector3(0, hipHeight + rootHeight / 2, 0));
}

/**
 * Moves a humanoid body so its feet stand on `feet`, facing feet.LookVector.
 * A model without a Humanoid or root is pivoted to `feet` as-is.
 */
export function placeBody(body: Model, feet: CFrame): void {
	const humanoid = body.FindFirstChildOfClass("Humanoid");
	const root = body.PrimaryPart ?? body.FindFirstChild("HumanoidRootPart");
	if (humanoid === undefined || root === undefined || !root.IsA("BasePart")) {
		body.PivotTo(feet);
		return;
	}
	const target = rootCFrameForFeet(feet, humanoid.HipHeight, root.Size.Y);
	// Move the pivot by whatever puts the root on target, whatever the pivot offset.
	body.PivotTo(target.mul(root.CFrame.Inverse()).mul(body.GetPivot()));
}

/** Where a humanoid body's feet are now: under its root, with the root's orientation. */
export function feetOf(body: Model): CFrame | undefined {
	const humanoid = body.FindFirstChildOfClass("Humanoid");
	const root = body.PrimaryPart;
	if (humanoid === undefined || root === undefined) return undefined;
	return root.CFrame.sub(new Vector3(0, humanoid.HipHeight + root.Size.Y / 2, 0));
}
