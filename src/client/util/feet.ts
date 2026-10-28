/**
 * The height of a rig's lower foot: the lowest corner of either foot's box,
 * wherever the pose has turned it. Undefined for a rig without feet.
 */
export function lowestFootY(rig: Model | undefined): number | undefined {
	let lowest = math.huge;
	for (const name of ["LeftFoot", "RightFoot"]) {
		const foot = rig?.FindFirstChild(name);
		if (!foot?.IsA("BasePart")) continue;
		const half = foot.Size.div(2);
		for (const x of [-1, 1]) {
			for (const y of [-1, 1]) {
				for (const z of [-1, 1]) {
					lowest = math.min(lowest, foot.CFrame.PointToWorldSpace(half.mul(new Vector3(x, y, z))).Y);
				}
			}
		}
	}
	return lowest === math.huge ? undefined : lowest;
}
