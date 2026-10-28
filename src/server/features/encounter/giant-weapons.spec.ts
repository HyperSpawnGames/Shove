import { describe, expect, it } from "@rbxts/jest-globals";
import { isWeaponAccessory } from "./giant-weapons";

describe("isWeaponAccessory", () => {
	it("takes the held weapon every Phoenix rig carries", () => {
		expect(isWeaponAccessory("Weapon")).toBe(true);
	});

	it("takes named weapons worn on backs and belts", () => {
		for (const name of ["BattleAxe", "Orc PolearmAccessory", "Orc ShieldAccessory", "dragon staff", "PotionStaff"]) {
			expect(isWeaponAccessory(name)).toBe(true);
		}
	});

	it("keeps armour, clothing and look-alike names", () => {
		for (const name of [
			"SwordmanAccessory",
			"Paladin",
			"Ice Crown",
			"Frost Pauldron Left",
			"Orc Chest ArmourAccessory",
		]) {
			expect(isWeaponAccessory(name)).toBe(false);
		}
	});
});
