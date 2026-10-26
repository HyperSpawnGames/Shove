/** One opponent: which prefab, how big, how hard, what it pays. */
export interface GiantDefinition {
	/** Prefab name under ServerStorage.Giants. */
	modelId: string;
	displayName: string;
	/**
	 * Model:ScaleTo factor. The prefabs are 1x and about player height. Kept
	 * at 2.5 or below: past that, animation and layered clothing break
	 * (docs/giant-scaling.md).
	 */
	scale: number;
	/** The Strength at which a steady clicker wins in 10–15 seconds. */
	recommendedStrength: number;
	/** Meter the giant pushes back per second. */
	resistancePerSecond: number;
	/** Wins every victory pays. */
	winsPayout: number;
}

/**
 * The staircase, bottom first: GIANTS[i] stands on terrace i, and beating it
 * the first time opens the ramp to terrace i + 1.
 */
export const GIANTS: readonly GiantDefinition[] = [
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
];
