import { Networking } from "@flamework/networking";

interface ClientToServerEvents {
	// training feature: ask to start or stop automatic push-ups. The server
	// decides whether the player may train and when each rep completes.
	requestStartTraining(): void;
	requestStopTraining(): void;
	// encounter feature: one shove in a giant fight. The server caps the rate
	// and decides how far the meter moves.
	requestShove(): void;
}

interface ServerToClientEvents {
	// training feature: a rep completed and granted this much Strength. Drives
	// the rep animation and the +Strength popup; the total travels over Replica.
	trainingRepCompleted(strengthGained: number): void;
}

interface ClientToServerFunctions {}

interface ServerToClientFunctions {}

export const GlobalEvents = Networking.createEvent<ClientToServerEvents, ServerToClientEvents>();
export const GlobalFunctions = Networking.createFunction<ClientToServerFunctions, ServerToClientFunctions>();
