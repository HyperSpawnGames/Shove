import { Controller, OnStart } from "@flamework/core";
import React from "@rbxts/react";
import { UiController } from "client/controllers/ui-controller";
import { BoostShop } from "./boost-shop";

@Controller({})
export class BoostShopController implements OnStart {
	constructor(private readonly ui: UiController) {}

	onStart(): void {
		this.ui.mount("BoostShop", <BoostShop />);
	}
}
