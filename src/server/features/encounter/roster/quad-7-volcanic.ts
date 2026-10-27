import { tierTuning } from "./tuning";
import type { QuadDefinition } from "./types";

/**
 * Quad 7, Volcanic. Obsidian and flowing lava: the Fire Troll, the Red Orc, the Magma Brute and the Doom Boss.
 * Owned by this quad's giant agent: start from tierTuning(index) in
 * tuning.ts and note any value you change and why.
 */
export const QUAD_7: QuadDefinition = {
	theme: "Volcanic",
	giants: [
		{
			modelId: "FireTroll",
			displayName: "Fire Troll",
			...tierTuning(24),
			// Hot-headed: flares up often and with little warning, in short bursts.
			surge: { minGap: 1.2, maxGap: 2.4, warning: 0.5, duration: 0.3, share: 0.7 },
		},
		{
			modelId: "RedOrc",
			displayName: "Red Orc",
			...tierTuning(25),
			// A brawler's rhythm: a narrow gap band, so the swings land on a beat.
			surge: { minGap: 2, maxGap: 2.6, warning: 0.6, duration: 0.4, share: 0.75 },
		},
		{
			modelId: "MagmaBrute",
			displayName: "Magma Brute",
			...tierTuning(26),
			// Slow eruptions: long quiet build-ups, a long rumble, then a heavy lunge.
			surge: { minGap: 3.8, maxGap: 5.5, warning: 1.1, duration: 0.55, share: 0.85 },
		},
		{
			modelId: "DoomBoss",
			displayName: "Doom Boss",
			...tierTuning(27),
			// Crushing and relentless: frequent, heavy lunges that carry most of its push.
			surge: { minGap: 1.6, maxGap: 2.8, warning: 0.8, duration: 0.5, share: 0.9 },
		},
	],
};
