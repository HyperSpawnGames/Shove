import { PhysicsService } from "@rbxts/services";

/** The collision group every staircase gate wall is in. */
export const GATE_GROUP = "StaircaseGate";
/** A body in this group walks through gate walls and collides with everything else. */
export const GATE_GHOST_GROUP = "GateGhost";

/**
 * Registers the gate and ghost collision groups, once. Groups registered on
 * the server replicate, so a ghost's own client lets it through the walls
 * too, with no client code.
 */
export function registerGateGroups(): void {
	for (const group of [GATE_GROUP, GATE_GHOST_GROUP]) {
		if (!PhysicsService.IsCollisionGroupRegistered(group)) PhysicsService.RegisterCollisionGroup(group);
	}
	PhysicsService.CollisionGroupSetCollidable(GATE_GROUP, GATE_GHOST_GROUP, false);
}
