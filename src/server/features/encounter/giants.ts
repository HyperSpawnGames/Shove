/** One opponent: which prefab, how big, how hard, what it pays, where it waits. */
export interface GiantDefinition {
	/** Prefab name under ServerStorage.Giants. */
	modelId: string;
	displayName: string;
	/** Model:ScaleTo factor. The prefabs are 1x and about player height. */
	scale: number;
	/** The Strength at which a steady clicker wins in 10–15 seconds. */
	recommendedStrength: number;
	/** Meter the giant pushes back per second. */
	resistancePerSecond: number;
	/** Wins every victory pays. */
	winsPayout: number;
	/** Where the giant stands in the lobby, feet on the ground. */
	lobbyPosition: Vector3;
}

export const GIANTS: readonly GiantDefinition[] = [
	{
		modelId: "Noob",
		displayName: "Noob",
		scale: 1.6,
		recommendedStrength: 20,
		resistancePerSecond: 0.04,
		winsPayout: 5,
		lobbyPosition: new Vector3(0, 1, -36),
	},
];
