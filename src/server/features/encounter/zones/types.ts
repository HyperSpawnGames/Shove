import type { QuadDefinition } from "../roster/types";
import type { RampLayout, TerraceLayout } from "../world-layout";

/** A box no collidable prop may enter, so the climb and the fights stay reachable. */
export interface ClearZone {
	cframe: CFrame;
	size: Vector3;
}

/** Everything a zone's environment builder knows about its stretch of the staircase. */
export interface ZoneContext {
	/** This zone's own folder in the staircase: put every prop here. */
	folder: Folder;
	quadIndex: number;
	quad: QuadDefinition;
	/** The quad's giant terraces, bottom first, one per giant in quad.giants. */
	terraces: TerraceLayout[];
	/** The raised blocks under those terraces (none for the ground), for restyling color and material. */
	terraceParts: BasePart[];
	/** The ramps up onto each of this quad's terraces that has one, bottom first. */
	ramps: RampLayout[];
	/**
	 * Keep-clear boxes: each pedestal and the space around it, where players
	 * stand to challenge and land after a fight, and the walking lane from
	 * each ramp to the next. Props here must have CanCollide off.
	 */
	clearZones: ClearZone[];
}

/**
 * Dresses one zone. Runs once on the server at startup, after the zone's
 * terraces, ramps, gates and giants exist. A builder that throws loses only
 * its own props: the world still builds.
 */
export type ZoneBuilder = (context: ZoneContext) => void;
