/** Camera distance that frames a 1× player the way the default camera starts. */
export const FRAMING_DISTANCE = 12.5;

/** The sizes a player may be set to. */
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 25;

/** True for a finite scale within MIN_SCALE..MAX_SCALE. */
export function isValidScale(scale: number): boolean {
	return scale >= MIN_SCALE && scale <= MAX_SCALE;
}

/** A 1× body's settings, read from StarterPlayer. */
export interface BodyDefaults {
	readonly walkSpeed: number;
	readonly jumpHeight: number;
	readonly cameraMaxZoom: number;
}

export interface BodyTuning {
	readonly walkSpeed: number;
	readonly jumpHeight: number;
	readonly cameraMinZoom: number;
	readonly cameraMaxZoom: number;
}

/**
 * Movement and camera settings for a body at `scale`. Speed and jump height
 * grow with the body so every terrace takes as long to cross, and jumps clear
 * the same number of body heights, at any size. The minimum zoom is the
 * default framing times the scale, which pushes the camera out as the body
 * grows (and rules out first person); the maximum grows the same way.
 */
export function bodyTuning(scale: number, defaults: BodyDefaults): BodyTuning {
	return {
		walkSpeed: defaults.walkSpeed * scale,
		jumpHeight: defaults.jumpHeight * scale,
		cameraMinZoom: FRAMING_DISTANCE * scale,
		cameraMaxZoom: math.max(defaults.cameraMaxZoom, FRAMING_DISTANCE) * scale,
	};
}
