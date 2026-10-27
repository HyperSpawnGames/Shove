import { tierTuning } from "./tuning";
import type { QuadDefinition } from "./types";

/**
 * Quad 4, Castle. A walled keep of stone and banners: the Archer, the Mage, the Knight and the Commander.
 * Owned by this quad's giant agent: start from tierTuning(index) in
 * tuning.ts and note any value you change and why.
 */
export const QUAD_4: QuadDefinition = {
	theme: "Castle",
	giants: [
		{
			modelId: "Archer",
			displayName: "Archer",
			...tierTuning(12),
			// Quick and evasive: frequent short jabs on a brief warning, with
			// more of the push held back as steady pressure between them.
			surge: { minGap: 1.1, maxGap: 2.2, warning: 0.45, duration: 0.25, share: 0.55 },
		},
		{
			modelId: "Mage",
			displayName: "Mage",
			...tierTuning(13),
			// Long telegraphed casts: rare surges with the longest wind-up,
			// then a drawn-out blast that carries most of the push.
			surge: { minGap: 3.2, maxGap: 4.8, warning: 1.2, duration: 0.55, share: 0.8 },
		},
		{
			modelId: "Knight",
			displayName: "Knight",
			...tierTuning(14),
			// Steady, disciplined rhythm: a near-fixed gap so the surges land
			// like drill beats, with an ordinary warning and lunge.
			surge: { minGap: 2.4, maxGap: 2.6, warning: 0.7, duration: 0.4, share: 0.7 },
		},
		{
			modelId: "Commander",
			displayName: "Commander",
			...tierTuning(15),
			// Relentless and heavy: short gaps, a terse warning and long lunges
			// that carry almost the whole push.
			surge: { minGap: 1.5, maxGap: 2.5, warning: 0.6, duration: 0.55, share: 0.9 },
		},
	],
};
