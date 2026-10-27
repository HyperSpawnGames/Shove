/**
 * The priorities Animate plays at. Core's enum value is 1000, so these are
 * named rather than compared by value.
 */
const BACKGROUND_PRIORITIES = new Set<Enum.AnimationPriority>([
	Enum.AnimationPriority.Core,
	Enum.AnimationPriority.Idle,
	Enum.AnimationPriority.Movement,
]);

/**
 * Pauses a character's own Animate script (the one Roblox gives every
 * character, playing its idle, walk and its avatar's animation pack) and
 * fades out the tracks it is playing, leaving Action-priority tracks alone.
 * Code posing layers under the Animator, so while a pack's idle plays it
 * bends every posed limb: many packs hold the arms out to the sides, which
 * swings a forward push down to the hips. Returns resume, which re-enables
 * the script; it restarts and plays its idle again.
 *
 * Only the client that owns a character should pause it: the tracks it
 * stops then stop for everyone.
 */
export function pauseAnimate(character: Model): () => void {
	const animate = character.FindFirstChild("Animate");
	const animateScript = animate?.IsA("BaseScript") ? animate : undefined;
	if (animateScript) animateScript.Enabled = false;

	const animator = character.FindFirstChildOfClass("Humanoid")?.FindFirstChildOfClass("Animator");
	for (const track of animator?.GetPlayingAnimationTracks() ?? []) {
		if (BACKGROUND_PRIORITIES.has(track.Priority)) track.Stop(0.15);
	}

	return () => {
		if (animateScript && animateScript.Parent !== undefined) animateScript.Enabled = true;
	};
}
