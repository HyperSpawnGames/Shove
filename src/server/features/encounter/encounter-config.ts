/** Where the meter starts: the middle of the platform. */
export const START_METER = 0.5;
/** Meter one shove gains when Strength equals the giant's recommendation. */
export const BASE_SHOVE_GAIN = 0.0136;
/** No single shove gains more than this, so a far stronger player wins in one click. */
export const MAX_SHOVE_GAIN = 0.5;
/** Added to both sides of the Strength ratio, so 0 Strength still pushes a little. */
export const STRENGTH_RATIO_OFFSET = 10;

/** Shoves the server accepts per second on average; extra clicks are dropped. */
export const MAX_SHOVES_PER_SECOND = 8;
/** Shoves that may arrive back to back before the per-second cap applies. */
export const SHOVE_BURST = 3;

/** Seconds both fighters hold their pose before the giant starts pushing. */
export const READY_SECONDS = 2;
/** A fight still undecided after this many seconds is lost. */
export const MAX_FIGHT_SECONDS = 30;
/** Seconds the throw plays before the player is returned to the lobby. */
export const RESULT_SECONDS = 2.5;
/** At most this many meter updates per second replicate to the client. */
export const METER_PUBLISH_RATE = 20;

/** The first arena's centre; each further slot sits ARENA_SPACING studs along +X. */
export const ARENA_ORIGIN = new Vector3(4000, 400, 4000);
export const ARENA_SPACING = 600;
/** Platform half-length along the shove axis, before the giant's size adds to it. */
export const ARENA_BASE_HALF_LENGTH = 14;
/** Extra half-length per unit of giant scale, so a bigger giant gets a bigger stage. */
export const ARENA_HALF_LENGTH_PER_SCALE = 6;
export const ARENA_WIDTH = 30;
/** Studs from the meeting point to a 1x fighter's root; a giant's scales with it. */
export const FIGHTER_REACH = 2.2;

/** Share of a giant's push that comes in surges rather than steadily. */
export const SURGE_SHARE = 0.75;
/** Surge rhythm: quiet gap, wind-up warning and lunge length, in seconds. */
export const SURGE_TIMING = { minGap: 1.8, maxGap: 3.4, warning: 0.7, duration: 0.35 };
/** Quiet seconds at the start of the struggle before the first surge can land. */
export const FIRST_SURGE_DELAY = 1.2;
/** Walk speed once the last empty terrace is reached; each quad finished gets the player a share of the way there. */
export const MAX_WALK_SPEED = 100;
