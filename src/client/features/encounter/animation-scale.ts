/**
 * The arithmetic behind the ScaleTo animation fix-up (docs/giant-scaling.md,
 * sections 5 and 7): on a rig sized with Model:ScaleTo(k) the engine has been
 * moving joints by k² instead of k, and a probe on each client decides
 * whether that is still so before the fix-up divides it back.
 */

/** What the probe concluded about the engine on this client. */
export type ProbeVerdict = "doubled" | "correct" | "inconclusive";

/** Joints whose 1x translation is shorter than this (studs) carry too little signal to compare. */
const MIN_REFERENCE_TRANSLATION = 1e-3;
/**
 * How close, as a share of log(k), a measured ratio must come to k or k² to
 * count as that. At k = 4 this accepts 3.2–5 as k and 12.8–20 as k².
 */
const LOG_TOLERANCE = 0.16;

/**
 * A joint's animated offset with its translation divided by `scale`, rotation
 * untouched: what the Animator should have written on a rig scaled by `scale`
 * when it wrote `transform`.
 */
export function correctedTransform(transform: CFrame, scale: number): CFrame {
	return transform.Rotation.add(transform.Position.div(scale));
}

/**
 * How much farther the same frozen pose moves the joints of a scaled rig than
 * those of its 1x reference: total translation over total translation, from
 * the joints present in both whose reference moves at all. Undefined when no
 * joint carries enough signal.
 */
export function translationRatio(
	reference: ReadonlyMap<string, number>,
	scaled: ReadonlyMap<string, number>,
): number | undefined {
	let referenceTotal = 0;
	let scaledTotal = 0;
	for (const [name, length] of reference) {
		const other = scaled.get(name);
		if (other === undefined || length < MIN_REFERENCE_TRANSLATION) continue;
		referenceTotal += length;
		scaledTotal += other;
	}
	if (referenceTotal < MIN_REFERENCE_TRANSLATION) return undefined;
	return scaledTotal / referenceTotal;
}

/**
 * Reads a measured ratio for a rig scaled by `scale`: about scale² means the
 * engine still double-scales, about scale means it animates correctly, and
 * anything else (or no measurement) is inconclusive.
 */
export function probeVerdict(ratio: number | undefined, scale: number): ProbeVerdict {
	if (ratio === undefined || ratio <= 0 || ratio !== ratio || scale <= 1) return "inconclusive";
	const logScale = math.log(scale);
	const measured = math.log(ratio);
	if (math.abs(measured - 2 * logScale) <= LOG_TOLERANCE * logScale) return "doubled";
	if (math.abs(measured - logScale) <= LOG_TOLERANCE * logScale) return "correct";
	return "inconclusive";
}

/**
 * Whether to divide joint translations: only when the engine was seen to
 * correct itself does the fix-up stay off. An inconclusive probe keeps it on,
 * since double-scaling is what the engine was last measured to do.
 */
export function shouldApplyFixup(verdict: ProbeVerdict): boolean {
	return verdict !== "correct";
}
