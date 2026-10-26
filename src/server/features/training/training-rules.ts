/** Strength per completed push-up: arm strength A times the pet multiplier M. */
export function strengthPerRep(armStrength: number, petMultiplier: number): number {
	return armStrength * petMultiplier;
}

export interface TrainingStartState {
	training: boolean;
	alive: boolean;
	onGround: boolean;
	/** The body is anchored: something else (a giant fight) holds it in place. */
	held: boolean;
}

/** Training starts only from a living, free body standing on ground, and never twice. */
export function canStartTraining(state: TrainingStartState): boolean {
	return !state.training && state.alive && state.onGround && !state.held;
}

/**
 * Whether the body has walked away from where training started. Only the
 * horizontal distance counts, so the push-up itself moving the root up and
 * down never ends a session.
 */
export function hasLeftTrainingSpot(origin: Vector3, current: Vector3, tolerance: number): boolean {
	const dx = current.X - origin.X;
	const dz = current.Z - origin.Z;
	return dx * dx + dz * dz > tolerance * tolerance;
}
