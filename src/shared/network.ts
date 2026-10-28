import { Networking } from "@flamework/networking";
import type { BoostKind } from "./features/boosts/boost-catalog";

interface ClientToServerEvents {
	// training feature: ask to start or stop automatic push-ups. The server
	// decides whether the player may train and when each rep completes.
	requestStartTraining(): void;
	requestStopTraining(): void;
	// encounter feature: one shove in a giant fight. The server caps the rate
	// and decides how far the meter moves.
	requestShove(): void;
	// boosts feature: buy the next tier of a ladder for Wins, or wear a tier
	// already bought ("" takes it off). The server checks ownership and price.
	requestBuyBoost(kind: BoostKind, id: string): void;
	requestEquipBoost(kind: BoostKind, id: string): void;
}

interface ServerToClientEvents {
	// training feature: a rep completed and raised effective Strength (saved
	// Strength times any multiplier) this much. Drives the rep animation and the
	// +Strength popup; the saved total travels over Replica.
	trainingRepCompleted(strengthGained: number): void;
}

interface ClientToServerFunctions {}

interface ServerToClientFunctions {}

export const GlobalEvents = Networking.createEvent<ClientToServerEvents, ServerToClientEvents>();
export const GlobalFunctions = Networking.createFunction<ClientToServerFunctions, ServerToClientFunctions>();
