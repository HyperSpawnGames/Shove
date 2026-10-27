import type { QuadDefinition } from "./types";
import { tierTuning } from "./tuning";

/**
 * Quad 5, Frost. Glacier and snowfield: the Winter Assassin, the Frost Mage, the Ice King and the Yeti Warlord.
 * Owned by this quad's giant agent: start from tierTuning(index) in
 * tuning.ts and note any value you change and why.
 */
export const QUAD_5: QuadDefinition = {
	theme: "Frost",
	giants: [
		{
			modelId: "WinterAssassin",
			displayName: "Winter Assassin",
			...tierTuning(16),
			// Strikes out of the snow: barely any wind-up, short sharp stabs at
			// unpredictable intervals, and most of the push hidden in them.
			surge: { minGap: 1.4, maxGap: 4.2, warning: 0.4, duration: 0.25, share: 0.8 },
		},
		{
			modelId: "FrostMage",
			displayName: "Frost Mage",
			...tierTuning(17),
			// Casts slowly: long gaps, a long freezing wind-up you can see
			// coming, then a long lunge that carries most of the push.
			surge: { minGap: 3.5, maxGap: 5.5, warning: 1.2, duration: 0.6, share: 0.85 },
		},
		{
			modelId: "IceKing",
			displayName: "Ice King",
			...tierTuning(18),
			// Regal and measured: an even, narrow-gapped cadence with a steady
			// push between surges, never hurried and never surprising.
			surge: { minGap: 2.8, maxGap: 3.2, warning: 0.9, duration: 0.45, share: 0.6 },
		},
		{
			modelId: "YetiWarlord",
			displayName: "Yeti Warlord",
			...tierTuning(19),
			// Brutal and relentless: frequent heavy lunges with a short roar of
			// warning, nearly all of the push coming in surges.
			surge: { minGap: 1, maxGap: 2, warning: 0.5, duration: 0.5, share: 0.9 },
		},
	],
};
