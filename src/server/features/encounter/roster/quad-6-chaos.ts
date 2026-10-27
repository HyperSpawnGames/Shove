import { tierTuning } from "./tuning";
import type { QuadDefinition } from "./types";

/**
 * Quad 6, Chaos. A cursed, violet wasteland: the Demon Ninja, the Chaos Mage, the Chaos Summoner and the Void Tyrant.
 * Owned by this quad's giant agent: start from tierTuning(index) in
 * tuning.ts and note any value you change and why.
 *
 * Staircase indices 20–23. All tuning values are the curve's, unchanged;
 * each giant differs only in its surge rhythm.
 */
export const QUAD_6: QuadDefinition = {
	theme: "Chaos",
	giants: [
		{
			modelId: "DemonNinja",
			displayName: "Demon Ninja",
			...tierTuning(20),
			// Erratic and fast: frequent, short, barely telegraphed jabs at irregular intervals.
			surge: { minGap: 1, maxGap: 3, warning: 0.4, duration: 0.25, share: 0.65 },
		},
		{
			modelId: "ChaosMage",
			displayName: "Chaos Mage",
			...tierTuning(21),
			// Unpredictable: the widest gap range in the quad, so a surge can come at any moment.
			surge: { minGap: 1, maxGap: 6, warning: 0.6, duration: 0.4, share: 0.7 },
		},
		{
			modelId: "ChaosSummoner",
			displayName: "Chaos Summoner",
			...tierTuning(22),
			// Long ritual wind-ups: rare surges with the longest warning, then a heavy, sustained push.
			surge: { minGap: 4, maxGap: 6, warning: 1.2, duration: 0.55, share: 0.8 },
		},
		{
			modelId: "VoidTyrant",
			displayName: "Void Tyrant",
			...tierTuning(23),
			// Overwhelming: most of the push comes in long, frequent lunges with little warning.
			surge: { minGap: 2, maxGap: 3.5, warning: 0.5, duration: 0.6, share: 0.9 },
		},
	],
};
