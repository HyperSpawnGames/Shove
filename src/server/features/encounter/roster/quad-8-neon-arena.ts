import type { QuadDefinition } from "./types";
import { tierTuning } from "./tuning";

/**
 * Quad 8, Neon Arena. A neon-lit fighting colosseum at the summit: Buffnoob, Brawk Tyson, the Iron Champion and the Cyber Lord.
 * Owned by this quad's giant agent: start from tierTuning(index) in
 * tuning.ts and note any value you change and why.
 */
export const QUAD_8: QuadDefinition = {
	theme: "Neon Arena",
	giants: [
		{
			modelId: "BuffNoob",
			displayName: "Buffnoob",
			...tierTuning(28),
			// All muscle, no technique: wide, irregular gaps and a long, obvious
			// wind-up before a heavy shove, with plenty of steady push between.
			surge: { minGap: 2, maxGap: 5, warning: 1.1, duration: 0.5, share: 0.65 },
		},
		{
			modelId: "FeatherweightChamp",
			// The prefab's full title, "Brawk Tyson: Featherweight Champ", is too
			// long for the scaled-text sign and gate label; the table in
			// docs/giant-quads.md already uses the short name.
			displayName: "Brawk Tyson",
			...tierTuning(29),
			// A quick boxer throwing combos: jabs in close succession with little
			// telegraph, each one short, most of the push in the flurries.
			surge: { minGap: 1, maxGap: 1.8, warning: 0.45, duration: 0.25, share: 0.75 },
		},
		{
			modelId: "IronChampion",
			displayName: "Iron Champion",
			...tierTuning(30),
			// A heavyweight throwing haymakers: patient gaps, a clear wind-up, then
			// a long lunge that carries nearly all of the push.
			surge: { minGap: 3.5, maxGap: 5, warning: 0.9, duration: 0.6, share: 0.85 },
		},
		{
			modelId: "CyberLord",
			displayName: "Cyber Lord",
			...tierTuning(31),
			// The final boss, precise and punishing: a metronome-tight cadence with
			// a minimal warning and the most push of any giant in its surges.
			surge: { minGap: 1.6, maxGap: 1.9, warning: 0.4, duration: 0.4, share: 0.9 },
		},
	],
};
