import { Controller, OnStart } from "@flamework/core";
import React from "@rbxts/react";
import { UiController } from "client/controllers/ui-controller";
import { WinsHud } from "./wins-hud";

@Controller({})
export class WinsHudController implements OnStart {
	constructor(private readonly ui: UiController) {}

	onStart(): void {
		this.ui.mount("WinsHud", <WinsHud />);
	}
}
