/** One opponent: which prefab, how big, how hard, what it pays, how it fights. */
export interface GiantDefinition {
	/** Prefab name under ServerStorage.Giants. */
	modelId: string;
	displayName: string;
	/**
	 * Absolute size: the factor on the 1x prefab, which is about player
	 * height. Up to 2.5 the giant is sized through its Humanoid's body-scale
	 * values; above, through Model:ScaleTo plus the client fix-up
	 * (docs/giant-scaling.md).
	 */
	scale: number;
	/** The Strength at which a steady clicker wins in 10–15 seconds. */
	recommendedStrength: number;
	/** Meter the giant pushes back per second, on average. */
	resistancePerSecond: number;
	/** Wins every victory pays. */
	winsPayout: number;
	/** How this giant surges, where it differs from the default rhythm. */
	surge?: SurgeStyle;
}

/**
 * A giant's fighting rhythm, overriding SURGE_TIMING and SURGE_SHARE field by
 * field. The average push stays `resistancePerSecond` whatever the rhythm, so
 * a style changes how a fight feels, never how long it lasts.
 */
export interface SurgeStyle {
	/** Quiet seconds between surges, drawn uniformly from min to max. */
	minGap?: number;
	maxGap?: number;
	/** Seconds of wind-up warning before each lunge. */
	warning?: number;
	/** Seconds each lunge pushes. */
	duration?: number;
	/** Share of the push that comes in surges rather than steadily, 0..1. */
	share?: number;
}

/**
 * Four giants in a row sharing a zone theme. Quads with fewer than four
 * giants build what they have; a quad with none takes no room yet.
 */
export interface QuadDefinition {
	/** The zone's name, shown nowhere yet; used for logs and as the zone folder name. */
	theme: string;
	giants: GiantDefinition[];
}
