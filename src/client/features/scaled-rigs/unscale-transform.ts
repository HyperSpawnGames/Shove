/**
 * The joint transform a ScaleTo'd rig should have: the Animator's rotation,
 * with its translation divided by the model's scale so it moves k× rather than
 * k²× (docs/giant-scaling.md, section 5).
 */
export function unscaleTransform(transform: CFrame, scale: number): CFrame {
	return transform.Rotation.add(transform.Position.div(scale));
}
