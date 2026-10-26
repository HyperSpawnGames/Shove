/**
 * Player attributes the encounter feature's server component writes and its
 * client reads. Fight state, not profile data; all unset outside a fight.
 */
export const EncounterAttribute = {
	/** EncounterPhase: the fight's current phase. */
	Phase: "EncounterPhase",
	/** number 0..1: the meter. 0 puts the player off the left cliff, 1 the giant off the right. */
	Meter: "EncounterMeter",
	/** string: the opponent's display name. */
	GiantName: "EncounterGiantName",
	/** number: Wins a victory pays. */
	Reward: "EncounterReward",
} as const;

export type EncounterPhase = "Ready" | "Struggle" | "Won" | "Lost";

/** Workspace folder holding every live arena, each a Model named by its player's UserId. */
export const ARENAS_FOLDER = "Arenas";

/** Attributes on an arena Model, placing the fighters for the client. */
export const ArenaAttribute = {
	/** CFrame: the player's root at meter 0.5, facing the giant. */
	PlayerStart: "PlayerStart",
	/** CFrame: the giant's pivot at meter 0.5, facing the player. */
	GiantStart: "GiantStart",
	/** number: studs both fighters slide from the middle when the meter reaches either end. */
	TravelLength: "TravelLength",
} as const;

/** The opponent inside an arena Model. */
export const ARENA_GIANT_NAME = "Giant";
