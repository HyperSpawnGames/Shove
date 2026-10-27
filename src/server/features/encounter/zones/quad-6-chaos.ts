import { buildProps } from "./quad-6/build";
import { planChaosZone } from "./quad-6/plan";
import type { ZoneBuilder } from "./types";

/** Cracked near-black violet stone for the terraces themselves. */
const TERRACE_COLOR = Color3.fromRGB(44, 32, 58);

/**
 * Quad 6's environment: the Chaos zone, a cursed violet wasteland. The
 * terraces turn to dark slate; quad-6/plan.ts places the dressing, clear of
 * the climb, and quad-6/build.ts builds it.
 */
export const buildChaosZone: ZoneBuilder = (context) => {
	for (const terrace of context.terraceParts) {
		terrace.Color = TERRACE_COLOR;
		terrace.Material = Enum.Material.Slate;
	}
	buildProps(
		context.folder,
		planChaosZone({ terraces: context.terraces, ramps: context.ramps, clearZones: context.clearZones }),
	);
};
