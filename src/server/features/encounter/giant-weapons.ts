/**
 * Accessories on the giant prefabs that are weapons: the held "Weapon" every
 * Phoenix rig carries, and the named ones worn on backs and belts (axes,
 * swords, a polearm, a shield, a bow and quiver, mages' staffs). Giants fight
 * bare-handed for now, so these are removed when a giant is spawned. Listed
 * by exact name, from an inventory of all 32 prefabs, so armour and
 * look-alike names (Baron's "SwordmanAccessory" is face gear) stay.
 */
const WEAPON_ACCESSORIES = new Set<string>([
	"Weapon",
	"axe2h11_black",
	"axe2h02_blue",
	"BattleAxe",
	"Orc SwordAccessory",
	"Orc PolearmAccessory",
	"Orc ShieldAccessory",
	"ShadowBladeMasterAccessory",
	"Meshes/BowNArrow_Cube.188_Cube.211Accessory",
	"Meshes/BowNArrow_Cylinder.085_Cylinder.128Accessory",
	"MagicStaffAccessory",
	"PotionStaff",
	"Golden Corrupted Staff",
	"dragon staff",
]);

/** Whether an accessory with this name is a weapon a giant should not carry. */
export function isWeaponAccessory(name: string): boolean {
	return WEAPON_ACCESSORIES.has(name);
}
