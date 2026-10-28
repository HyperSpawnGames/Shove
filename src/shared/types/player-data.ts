export const PLAYER_DATA_TOKEN = "PlayerData";

/**
 * The profile document as the client sees it through Replica. Defaults and
 * migrations are server-only: src/server/services/player/.
 */
export interface PlayerData {
	Version: number;
	/** training feature: permanent Strength earned from push-ups. */
	Strength: number;
	/** wins feature: the spendable currency giant victories pay. */
	Wins: number;
	/** encounter feature: giants of the staircase beaten at least once; each opens the next ramp. */
	HighestCleared: number;
	/** boosts feature: outline tiers bought, by id. */
	Outlines: { [id: string]: boolean };
	/** boosts feature: power tiers bought, by id. */
	Powers: { [id: string]: boolean };
	/** boosts feature: the outline worn, or "" for none. */
	EquippedOutline: string;
	/** boosts feature: the power worn, or "" for none. */
	EquippedPower: string;
	Settings: { [key: string]: boolean };
}

/** Fields of PlayerData that are arrays, eligible for per-item inserts and removes. */
export type ArrayField = {
	[K in keyof PlayerData]: PlayerData[K] extends unknown[] ? K : never;
}[keyof PlayerData];

/** Fields of PlayerData that are maps (string-keyed tables), eligible for per-entry writes. */
export type MapField = {
	[K in keyof PlayerData]: PlayerData[K] extends unknown[]
		? never
		: PlayerData[K] extends { [id: string]: unknown }
			? K
			: never;
}[keyof PlayerData];
