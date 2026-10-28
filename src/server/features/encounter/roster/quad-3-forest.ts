import { tierTuning } from "./tuning";
import type { QuadDefinition } from "./types";

/**
 * Quad 3, Forest. Deep, mossy woodland: the Mossling Scout, the Forest Troll, the Leaf Ninja and the Ancient Treant.
 * Owned by this quad's giant agent: start from tierTuning(index) in
 * tuning.ts and note any value you change and why.
 *
 * Staircase indices 8 to 11; every number comes straight from the curves.
 * Only the surge rhythms are this quad's own.
 */
export const QUAD_3: QuadDefinition = {
	theme: "Forest",
	giants: [
		{
			modelId: "MosslingScout",
			displayName: "Mossling Scout",
			...tierTuning(8),
			// Skittish: darts in often with quick, short jabs after a brief
			// flinch, and leans more on steady pushing than on big lunges.
			surge: { minGap: 1.4, maxGap: 2.4, warning: 0.55, duration: 0.25, share: 0.6 },
		},
		{
			modelId: "ForestTroll",
			displayName: "Forest Troll",
			...tierTuning(9),
			// Lumbering: long lulls, a slow, readable heave, then a long
			// heavy shove that carries most of its push.
			surge: { minGap: 4, maxGap: 5.5, warning: 1, duration: 0.6, share: 0.85 },
		},
		{
			modelId: "LeafNinja",
			displayName: "Leaf Ninja",
			...tierTuning(10),
			// Twitchy: the shortest gaps and barely any tell, so surges come
			// fast and frequent, each one a flick.
			surge: { minGap: 1, maxGap: 1.6, warning: 0.4, duration: 0.25, share: 0.7 },
		},
		{
			modelId: "AncientTreant",
			displayName: "Ancient Treant",
			...tierTuning(11),
			// Slow and devastating: rare surges behind the longest wind-up,
			// and most of the push lands in each long lunge.
			surge: { minGap: 4.5, maxGap: 5, warning: 1.2, duration: 0.6, share: 0.8 },
		},
	],
};
