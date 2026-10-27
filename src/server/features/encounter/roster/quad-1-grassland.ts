import type { QuadDefinition } from "./types";

/**
 * Quad 1, Grassland. Rolling green hills at the foot of the climb: the Noob, the Goblin, the Viking and Baron.
 * Owned by this quad's giant agent: start from tierTuning(index) in
 * tuning.ts and note any value you change and why.
 */
export const QUAD_1: QuadDefinition = {
	theme: "Grassland",
	giants: [
		{
			modelId: "Noob",
			displayName: "Noob",
			scale: 1.6,
			recommendedStrength: 20,
			resistancePerSecond: 0.04,
			winsPayout: 5,
		},
		{
			modelId: "Goblin",
			displayName: "Goblin",
			scale: 2,
			recommendedStrength: 120,
			resistancePerSecond: 0.04,
			winsPayout: 20,
		},
		{
			modelId: "Viking",
			displayName: "Viking",
			scale: 2.5,
			recommendedStrength: 500,
			resistancePerSecond: 0.04,
			winsPayout: 75,
		},
	],
};
