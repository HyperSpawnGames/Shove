import { buildGrasslandZone } from "./quad-1-grassland";
import { buildDesertZone } from "./quad-2-desert";
import { buildForestZone } from "./quad-3-forest";
import { buildCastleZone } from "./quad-4-castle";
import { buildFrostZone } from "./quad-5-frost";
import { buildChaosZone } from "./quad-6-chaos";
import { buildVolcanicZone } from "./quad-7-volcanic";
import { buildNeonArenaZone } from "./quad-8-neon-arena";
import type { ZoneBuilder } from "./types";

/** Each quad's environment builder, in QUADS order. */
export const ZONE_BUILDERS: readonly ZoneBuilder[] = [
	buildGrasslandZone,
	buildDesertZone,
	buildForestZone,
	buildCastleZone,
	buildFrostZone,
	buildChaosZone,
	buildVolcanicZone,
	buildNeonArenaZone,
];
