import type { PlayerData } from "shared/types/player-data";
import { LATEST_VERSION } from "./migrations";

/** ProfileStore template: new profiles start here and Reconcile fills old ones. */
export const DEFAULT_PLAYER_DATA: PlayerData = {
	Version: LATEST_VERSION,
	Strength: 0,
	Wins: 0,
	HighestCleared: 0,
	Outlines: {},
	Powers: {},
	EquippedOutline: "",
	EquippedPower: "",
	Sizes: {},
	EquippedSize: "",
	Settings: {},
};
