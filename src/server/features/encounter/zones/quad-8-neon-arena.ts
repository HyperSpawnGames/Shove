import { ARENA, PART_BUDGET, planNeonArena } from "./quad-8/arena-plan";
import { buildProp } from "./quad-8/build-props";
import { keepClearBoxes } from "./quad-8/geometry";
import type { ZoneBuilder } from "./types";

/**
 * Quad 8's environment: the Neon Arena, a fighting colosseum at the summit.
 * Dark polished terraces trimmed in neon; rope posts, light towers and
 * crowded bleachers down the sides; holographic halos over each giant;
 * confetti; and a championship banner behind the last champion. Placement
 * is planned in quad-8/arena-plan.ts; this only restyles and builds.
 */
export const buildNeonArenaZone: ZoneBuilder = (context) => {
	for (const terrace of context.terraceParts) {
		terrace.Color = ARENA.terrace;
		terrace.Material = Enum.Material.SmoothPlastic;
		terrace.Reflectance = 0.12;
	}

	const specs = planNeonArena({
		terraces: context.terraces,
		scales: context.terraces.map((_, index) => context.quad.giants[index]?.scale ?? 1),
		keepClear: keepClearBoxes(context.clearZones, context.ramps, context.terraces),
	});
	if (specs.size() > PART_BUDGET)
		warn(`[push-a-giant] Neon Arena plans ${specs.size()} parts, over its ${PART_BUDGET} budget`);
	for (const spec of specs) buildProp(context.folder, spec);
};
