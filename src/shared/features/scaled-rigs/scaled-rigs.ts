/**
 * A body sized with Model:ScaleTo. The Animator scales a ScaleTo'd rig's joint
 * translations by the scale twice (docs/giant-scaling.md), and Transform does
 * not replicate, so every client corrects each tagged body it animates.
 */
export const SCALED_RIG_TAG = "ScaledRig";

/**
 * Workspace attribute the server sets to switch the correction off (false) for
 * comparison; unset means on.
 */
export const SCALED_RIG_FIXUP_ATTRIBUTE = "ScaledRigFixup";
