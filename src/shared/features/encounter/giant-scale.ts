/**
 * CollectionService tag on a giant sized with Model:ScaleTo. Each client
 * corrects its animated joints every frame while the engine moves them by
 * the scale squared (docs/giant-scaling.md, section 5).
 */
export const SCALED_GIANT_TAG = "ScaledGiant";

/** number attribute on a tagged giant: the scale its joint translations are divided by. */
export const ANIMATION_SCALE_ATTRIBUTE = "AnimationScale";
