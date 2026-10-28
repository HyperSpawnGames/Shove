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
	/** SurgePhase or unset: the giant is winding up a surge (Warn) or lunging (Push). */
	Surge: "EncounterSurge",
} as const;

export type EncounterPhase = "Ready" | "Struggle" | "Won" | "Lost";

export type SurgePhase = "Warn" | "Push";

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

/** CollectionService tag on each giant waiting on its terrace, which clients animate idly. */
export const LOBBY_GIANT_TAG = "LobbyGiant";
/** number attribute on a lobby giant: the height of the pedestal top its feet stand on. */
export const GIANT_FLOOR_ATTRIBUTE = "FloorY";

/** Workspace folder holding the staircase: terraces, ramps, gates and the giants on them. */
export const STAIRCASE_FOLDER = "Staircase";

/**
 * CollectionService tag on everything the staircase locks per player: each
 * ramp's gate wall (a BasePart) and each giant's Challenge prompt. The server
 * builds them locked for everyone; each client opens the ones its player has
 * unlocked. The server still refuses a challenge to a locked giant.
 */
export const STAIRCASE_LOCK_TAG = "StaircaseLock";
/** number attribute on a locked thing: the HighestCleared value that opens it. */
export const OPENS_AT_ATTRIBUTE = "OpensAt";
