import { QUAD_1 } from "./quad-1-grassland";
import { QUAD_2 } from "./quad-2-desert";
import { QUAD_3 } from "./quad-3-forest";
import { QUAD_4 } from "./quad-4-castle";
import { QUAD_5 } from "./quad-5-frost";
import { QUAD_6 } from "./quad-6-chaos";
import { QUAD_7 } from "./quad-7-volcanic";
import { QUAD_8 } from "./quad-8-neon-arena";
import type { GiantDefinition, QuadDefinition } from "./types";

/** The staircase's zones, bottom first. */
export const QUADS: readonly QuadDefinition[] = [QUAD_1, QUAD_2, QUAD_3, QUAD_4, QUAD_5, QUAD_6, QUAD_7, QUAD_8];

/**
 * Every giant in climbing order: GIANTS[i] stands on its own terrace, and
 * beating it the first time opens the way to GIANTS[i + 1].
 */
export const GIANTS: readonly GiantDefinition[] = (() => {
	const all: GiantDefinition[] = [];
	for (const quad of QUADS) for (const giant of quad.giants) all.push(giant);
	return all;
})();
