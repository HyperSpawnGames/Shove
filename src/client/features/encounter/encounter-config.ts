/** Shoves sent per second at most. Matches the server cap, which still decides. */
export const SHOVES_PER_SECOND = 8;

/** How quickly the drawn meter catches up with the server's, per second. */
export const METER_SMOOTHING = 12;

/** Camera distance from the meeting point, before the giant's height adds to it. */
export const CAMERA_BASE_DISTANCE = 18;
/** How far the camera sits to the player's side of the platform and above the floor. */
export const CAMERA_SIDE_SHIFT = 0.35;
export const CAMERA_HEIGHT = 7;

/** Seconds the loser takes to fly off the cliff. */
export const THROW_SECONDS = 1.4;
