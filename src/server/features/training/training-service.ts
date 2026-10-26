import { Components } from "@flamework/components";
import { OnStart, Service } from "@flamework/core";
import { Events } from "server/network";
import { TrainingSession } from "./training-session";

/**
 * Routes the training intents to the player's session. No session means the
 * profile is not loaded yet, so the intent is dropped.
 */
@Service({})
export class TrainingService implements OnStart {
	constructor(private readonly components: Components) {}

	onStart(): void {
		Events.requestStartTraining.connect((player) =>
			this.components.getComponent<TrainingSession>(player)?.requestStart(),
		);
		Events.requestStopTraining.connect((player) => this.components.getComponent<TrainingSession>(player)?.stop());
	}
}
