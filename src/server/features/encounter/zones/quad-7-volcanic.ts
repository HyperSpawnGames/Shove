import { buildPieces, restyleTerraces } from "./quad-7/build";
import { planVolcanicZone } from "./quad-7/plan";
import type { ZoneBuilder } from "./types";

/**
 * Quad 7's environment: the Volcanic zone. Black basalt terraces with lava
 * rivers down both sides that pool and spill over the edge, and beside each
 * giant small smoking cones, charred dead trees, obsidian rocks and vents.
 * Placement is planned in quad-7/plan.ts, clear of every keep-out box.
 */
export const buildVolcanicZone: ZoneBuilder = (context) => {
	restyleTerraces(context.terraceParts);
	buildPieces(context.folder, planVolcanicZone(context));
};
