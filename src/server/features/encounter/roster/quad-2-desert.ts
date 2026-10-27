import { tierTuning } from "./tuning";
import type { QuadDefinition } from "./types";

/**
 * Quad 2, Desert. Sun-baked dunes and sandstone: the Peasant, the Sun Gladiator, the Sand Mage and the Desert General.
 * Owned by this quad's giant agent: start from tierTuning(index) in
 * tuning.ts and note any value you change and why.
 */
export const QUAD_2: QuadDefinition = {
	theme: "Desert",
	giants: [
		{
			modelId: "Peasant",
			displayName: "Peasant",
			...tierTuning(4),
			// Hesitant: long pauses, a nervous over-long wind-up, and weak lunges;
			// most of his push is a steady lean rather than surges.
			surge: { minGap: 2.8, maxGap: 4.6, warning: 1, duration: 0.3, share: 0.55 },
		},
		{
			modelId: "SunGladiator",
			displayName: "Sun Gladiator",
			...tierTuning(5),
			// Showman: surges on a near-fixed beat the player can learn to read,
			// each a clear flourish of default size.
			surge: { minGap: 2.2, maxGap: 2.5, warning: 0.8, duration: 0.4, share: 0.75 },
		},
		{
			modelId: "SandMage",
			displayName: "Sand Mage",
			...tierTuning(6),
			// Caster: rare surges behind the longest wind-up in the brief, then a
			// long, heavy lunge that carries most of the push.
			surge: { minGap: 3.2, maxGap: 4.8, warning: 1.2, duration: 0.5, share: 0.8 },
		},
		{
			modelId: "DesertGeneral",
			displayName: "Desert General",
			...tierTuning(7),
			// Heavy and relentless: short gaps, little warning and long lunges,
			// with nearly all of the push in them.
			surge: { minGap: 1.2, maxGap: 2, warning: 0.5, duration: 0.55, share: 0.9 },
		},
	],
};
