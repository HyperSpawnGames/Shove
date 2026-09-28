import { BaseComponent, Component } from "@flamework/components";
import { OnPhysics, OnStart } from "@flamework/core";
import { Workspace } from "@rbxts/services";
import { SCALED_RIG_FIXUP_ATTRIBUTE, SCALED_RIG_TAG } from "shared/features/scaled-rigs/scaled-rigs";
import { unscaleTransform } from "./unscale-transform";

/** Player avatars are jointed with AnimationConstraints, the giant prefabs with Motor6Ds; both carry Transform. */
type AnimatedJoint = Motor6D | AnimationConstraint;

function isAnimatedJoint(instance: Instance): instance is AnimatedJoint {
	return instance.IsA("Motor6D") || instance.IsA("AnimationConstraint");
}

/**
 * Corrects the animation of a body the server sized with ScaleTo. The
 * Animator scales a ScaleTo'd rig's joint translations by its scale twice,
 * and Transform does not replicate, so every client divides each joint's
 * translation back down on Stepped: after the Animator writes it, before
 * physics reads it (docs/giant-scaling.md, section 5).
 */
@Component({ tag: SCALED_RIG_TAG })
export class ScaledRig extends BaseComponent<{}, Model> implements OnStart, OnPhysics {
	private readonly joints = new Set<AnimatedJoint>();
	private readonly connections: RBXScriptConnection[] = [];

	onStart(): void {
		for (const descendant of this.instance.GetDescendants()) {
			if (isAnimatedJoint(descendant)) this.joints.add(descendant);
		}
		// Accessories and streamed parts bring joints of their own after the tag arrives.
		this.connections.push(
			this.instance.DescendantAdded.Connect((descendant) => {
				if (isAnimatedJoint(descendant)) this.joints.add(descendant);
			}),
			this.instance.DescendantRemoving.Connect((descendant) => {
				if (isAnimatedJoint(descendant)) this.joints.delete(descendant);
			}),
		);
	}

	onPhysics(): void {
		if (Workspace.GetAttribute(SCALED_RIG_FIXUP_ATTRIBUTE) === false) return;
		const scale = this.instance.GetScale();
		if (scale === 1) return;
		for (const joint of this.joints) {
			joint.Transform = unscaleTransform(joint.Transform, scale);
		}
	}

	override destroy(): void {
		for (const connection of this.connections) connection.Disconnect();
		super.destroy();
	}
}
