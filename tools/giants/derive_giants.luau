--[[
	Derive new giant prefabs from the imported ones.

		lune run tools/giants/derive_giants.luau

	Run from the repo root. Python and the source repos the 26 imported giants came from
	are not on every machine, so the giants that have no source rig of their own are made
	here, from prefabs already in assets/ServerStorage/Giants/: each VARIANTS entry below
	starts from a base prefab, recolours it, reshapes it, moves accessories between
	giants and adds a few accents built from plain Parts. Output goes to
	assets/ServerStorage/Giants/<Id>.rbxm, and the "Derived giants" section of
	docs/giants-roster.md is rewritten from the same table. Edit VARIANTS and re-run;
	never edit the .rbxm files.

	The result keeps the prefab contract (docs/giant-scaling.md section 2.1), and the
	script fails loudly when it would not:
	- 15 R15 body parts plus HumanoidRootPart, the 15 Motor6Ds wired Part0 -> Part1 with
	  C0/C1 equal to the <Joint>RigAttachment pair, rest pose re-solved from the joints.
	- Humanoid with an Animator, RigType R15, the four Body*Scale/HeadScale values at 1,
	  HipHeight recomputed from the new geometry; feet on y = 0, everything unanchored,
	  PrimaryPart = HumanoidRootPart.
	- Proportions are per-part multipliers. A multiplier scales the part's Size AND its
	  OriginalSize, every attachment's Position AND OriginalPosition, so the engine's
	  avatar-scaling bookkeeping stays proportional. That matters: the game sizes giants
	  through the Humanoid's scale values (giant-models.ts), and the engine then
	  recomputes every part from OriginalSize / OriginalPosition. Scaling only Size would
	  snap the giant back to its base shape the moment it is spawned at any size but 1.
	- Layered clothing (a handle with a WrapLayer) is never resized: the engine draws a
	  garment at Size / InitialSize and fits it to the body's cages, so the garment
	  follows the reshaped body by itself (docs/giant-scaling.md section 3, point 1).
	- No new asset ids: every mesh, texture and decal in an output must already be in one
	  of the imported prefabs. Accents are plain Parts with engine materials.
	- Attributes: DisplayName, Height (body height in studs at 1x), RosterIndex (1-based
	  place on the staircase, docs/giant-quads.md), Zone (the quad number), Theme, and
	  Source = "derived:<base Id>".
]]

local fs = require("@lune/fs")
local roblox = require("@lune/roblox")

local CFrame = roblox.CFrame
local Color3 = roblox.Color3
local Content = roblox.Content
local Enum = roblox.Enum
local Instance = roblox.Instance
local Vector3 = roblox.Vector3

local GIANTS_DIR = "assets/ServerStorage/Giants"
local ROSTER_DOC = "docs/giants-roster.md"

local function v(x: number, y: number?, z: number?)
	return Vector3.new(x, y or x, z or x)
end

--[[
	One entry per derived giant.

	proportions  Per-part size multipliers (number = uniform, or v(x, y, z) in the part's
	             own axes: x width, y height, z depth). Keys are R15 part names or the
	             groups Torso, Arms (upper + lower), Hands, Legs (upper + lower), Feet; a
	             part name overrides its group.
	palette      { colour hex, material name } per part or group (same keys).
	stripTextures  Clear the body's own textures so the palette shows (BuffNoob's colours
	             live entirely in its textures).
	clothing     Classic Shirt / Pants: false removes it, a hex tints it.
	remove       Accessories (by name) to drop from the base.
	tint         Accessory name -> { hex, glow? }. Tints a SpecialMesh through
	             VertexColor (glow > 1 brightens it), a layered garment through its
	             SurfaceAppearance.Color, anything else through Color.
	scale        Accessory name -> uniform scale. Default: the mean multiplier of the body
	             part it hangs on; layered clothing never scales.
	transplant   Accessories copied from other prefabs: { from, name, as?, tint?, scale? }.
	build        Accents made of plain Parts, each its own Accessory so the engine scales
	             and welds it like any other: { name, part, attach, shape, size, at,
	             offset?, rot?, color, material, fromEnd?, tip? }. `at` is a fraction of
	             the (reshaped) part's size from its centre, `offset` is in studs after
	             that, `rot` is degrees (CFrame.Angles order). `fromEnd = "X" | "Y"` grows
	             the part out of that point along its own axis instead of centring it,
	             and `tip` puts a second accent on the far end.
	lights       PointLights: { part, color, range, brightness }.
]]
local VARIANTS = {
	{
		id = "MosslingScout",
		base = "LeafNinja",
		displayName = "Mossling Scout",
		quad = 3,
		theme = "Forest",
		rosterIndex = 9,
		look = "Small and quick: a slighter Leaf Ninja with a big head, moss-grass skin, bark hands and feet, moss-tinted jacket over bark-brown pants, a mossy tuft of hair and a short blade.",
		proportions = {
			Head = 1.1,
			Torso = v(0.88, 0.92, 0.9),
			Arms = v(0.85, 0.92, 0.85),
			Hands = 0.9,
			Legs = v(0.86, 0.9, 0.86),
			Feet = 0.9,
		},
		palette = {
			Head = { "#5E8233", "Grass" },
			Torso = { "#5E8233", "Grass" },
			Arms = { "#5E8233", "Grass" },
			Legs = { "#5E8233", "Grass" },
			Hands = { "#5C4028", "Wood" },
			Feet = { "#4E3622", "Wood" },
		},
		tint = {
			["Shizen Shinobi Jacket"] = { "#9CC46E" },
			["Shizen Shinobi Pants"] = { "#8C6946" },
			["True Liar Mask"] = { "#8A6440" },
		},
		scale = { Weapon = 0.7 },
		transplant = {
			{ from = "Peasant", name = "Brown Messy Fluffy Hair", as = "Moss Tuft", tint = { "#7FBF4A", 1.2 } },
		},
	},
	{
		id = "AncientTreant",
		base = "ForestTroll",
		displayName = "Ancient Treant",
		quad = 3,
		theme = "Forest",
		rosterIndex = 12,
		look = "Hulking: the Forest Troll widened and thickened into dark bark (Wood), tiger stripes darkened into bark grooves, a vine-green rope wrap, a crown of leaf balls and two branches growing out of each shoulder with leafy tips.",
		proportions = {
			Head = 1.0,
			UpperTorso = v(1.35, 1.15, 1.3),
			LowerTorso = v(1.3, 1.1, 1.25),
			Arms = v(1.3, 1.15, 1.3),
			Hands = 1.4,
			Legs = v(1.3, 1.0, 1.3),
			Feet = v(1.35, 1.1, 1.35),
		},
		palette = {
			Head = { "#543C26", "Wood" },
			Torso = { "#4A3422", "Wood" },
			Arms = { "#4A3422", "Wood" },
			Hands = { "#3C2A1C", "Wood" },
			Legs = { "#4A3422", "Wood" },
			Feet = { "#3C2A1C", "Wood" },
		},
		clothing = { Shirt = false, Pants = false },
		remove = { "Orc ShieldAccessory" },
		tint = {
			["Horned Mask of Boarbanzu 3"] = { "#7A5A38" },
			["Black Tigerstripes Torso"] = { "#3A2616" },
			["Black Tigerstripes Left"] = { "#3A2616" },
			["Black Tigerstripes Right"] = { "#3A2616" },
			["shoulderRightAccessory"] = { "#6E8C3C" },
			["Rope Wrap Final"] = { "#5E8C3A" },
		},
		build = {
			-- Leaf crown on the head.
			{ name = "LeafCrown", part = "Head", attach = "HatAttachment", shape = "Ball", size = v(1.3), at = v(0, 0.5, 0), offset = v(0, 0.2, 0.05), color = "#3F7A28", material = "Grass" },
			{ name = "LeafCrownLeft", part = "Head", attach = "HatAttachment", shape = "Ball", size = v(0.9), at = v(-0.5, 0.4, 0), offset = v(-0.05, 0, 0.1), color = "#4F8C30", material = "Grass" },
			{ name = "LeafCrownRight", part = "Head", attach = "HatAttachment", shape = "Ball", size = v(0.9), at = v(0.5, 0.4, 0), offset = v(0.05, 0, 0.1), color = "#4F8C30", material = "Grass" },
			{ name = "LeafCrownBack", part = "Head", attach = "HatAttachment", shape = "Ball", size = v(1.0), at = v(0, 0.35, 0.5), offset = v(0, 0, 0.05), color = "#356B22", material = "Grass" },
			-- Branches out of the shoulders, each with a leaf tuft on the end.
			{
				name = "BranchLeft", part = "LeftUpperArm", attach = "LeftShoulderAttachment", shape = "Cylinder",
				size = v(1.9, 0.34, 0.34), at = v(0, 0.5, 0), offset = v(0, -0.15, 0), rot = v(0, 0, 118), fromEnd = "X",
				color = "#3C2A1C", material = "Wood",
				tip = { shape = "Ball", size = v(0.85), color = "#4F8C30", material = "Grass" },
			},
			{
				name = "TwigLeft", part = "LeftUpperArm", attach = "LeftShoulderAttachment", shape = "Cylinder",
				size = v(1.2, 0.24, 0.24), at = v(0, 0.5, 0), offset = v(0, -0.2, 0.1), rot = v(0, 30, 150), fromEnd = "X",
				color = "#3C2A1C", material = "Wood",
				tip = { shape = "Ball", size = v(0.6), color = "#3F7A28", material = "Grass" },
			},
			{
				name = "BranchRight", part = "RightUpperArm", attach = "RightShoulderAttachment", shape = "Cylinder",
				size = v(1.9, 0.34, 0.34), at = v(0, 0.5, 0), offset = v(0, -0.15, 0), rot = v(0, 0, 62), fromEnd = "X",
				color = "#3C2A1C", material = "Wood",
				tip = { shape = "Ball", size = v(0.85), color = "#4F8C30", material = "Grass" },
			},
			{
				name = "TwigRight", part = "RightUpperArm", attach = "RightShoulderAttachment", shape = "Cylinder",
				size = v(1.2, 0.24, 0.24), at = v(0, 0.5, 0), offset = v(0, -0.2, 0.1), rot = v(0, -30, 30), fromEnd = "X",
				color = "#3C2A1C", material = "Wood",
				tip = { shape = "Ball", size = v(0.6), color = "#3F7A28", material = "Grass" },
			},
		},
	},
	{
		id = "YetiWarlord",
		base = "IceKing",
		displayName = "Yeti Warlord",
		quad = 5,
		theme = "Frost",
		rosterIndex = 20,
		look = "Broad: the Ice King's frame widened into a white fur (Fabric) body under ice-blue Paladin armour and ice-blue heavy pauldrons, a white fur beard and a pale horned beast mask as the horned helm; crown and face mask removed.",
		proportions = {
			Head = 1.1,
			UpperTorso = v(1.4, 1.1, 1.3),
			LowerTorso = v(1.35, 1.05, 1.3),
			Arms = v(1.35, 1.1, 1.35),
			Hands = 1.4,
			Legs = v(1.3, 0.95, 1.3),
			Feet = v(1.35, 1.1, 1.4),
		},
		palette = {
			Head = { "#E6EEF5", "Fabric" },
			Torso = { "#EEF3F7", "Fabric" },
			Arms = { "#EEF3F7", "Fabric" },
			Legs = { "#EEF3F7", "Fabric" },
			Hands = { "#C8D7E6", "Fabric" },
			Feet = { "#C8D7E6", "Fabric" },
		},
		remove = { "Ice Crown", "LunarDivineMaskAccessory1.0" },
		tint = {
			Paladin = { "#8CC8FF" },
			["Cultivator's Hair"] = { "#FFFFFF", 1.15 },
		},
		transplant = {
			{ from = "FireTroll", name = "Horned Mask of Boarbanzu", as = "Yeti Horned Helm", tint = { "#D2E6FF", 1.2 } },
			{ from = "Viking", name = "Swashbucklin Beard", as = "Yeti Beard", tint = { "#FFFFFF", 1.4 } },
			{ from = "Viking", name = "Clean Heavy Warrior Left Pauldron", as = "Frost Pauldron Left", tint = { "#9AD2FF", 1.1 } },
			{ from = "Viking", name = "Clean Heavy Warrior Right Pauldron", as = "Frost Pauldron Right", tint = { "#9AD2FF", 1.1 } },
		},
	},
	{
		id = "VoidTyrant",
		base = "ChaosSummoner",
		displayName = "Void Tyrant",
		quad = 6,
		theme = "Chaos",
		rosterIndex = 24,
		look = "Towering: the Chaos Summoner stretched tall (longer legs, arms and torso) in void black and deep violet, a violet-tinted Ice Crown, glowing neon-violet hands, a neon core on the chest, three neon spines fanning from the back and a violet light.",
		proportions = {
			Head = 1.0,
			UpperTorso = v(1.15, 1.2, 1.1),
			LowerTorso = v(1.12, 1.15, 1.1),
			Arms = v(1.1, 1.22, 1.1),
			Hands = 1.15,
			Legs = v(1.1, 1.28, 1.1),
			Feet = v(1.1, 1.1, 1.15),
		},
		palette = {
			Head = { "#3C1A5A", "SmoothPlastic" },
			Torso = { "#1C0E28", "SmoothPlastic" },
			Arms = { "#1C0E28", "SmoothPlastic" },
			Legs = { "#1C0E28", "SmoothPlastic" },
			Hands = { "#B060FF", "Neon" },
			Feet = { "#120A1C", "SmoothPlastic" },
		},
		clothing = { Pants = "#7A46AA" },
		tint = {
			["Dark Mask of Jangot"] = { "#9A66E6" },
			RightNullPauldron = { "#6A3CA8" },
			LeftNullPauldron = { "#6A3CA8" },
			["Black Earthen Tattoo Right"] = { "#C080FF", 1.6 },
			["Black Earthen Tattoo Left"] = { "#C080FF", 1.6 },
			["Rope Wrap Final"] = { "#6E3CA0" },
		},
		transplant = {
			{ from = "IceKing", name = "Ice Crown", as = "Void Crown", tint = { "#B070FF", 1.3 }, scale = 1.1 },
		},
		build = {
			{ name = "VoidCore", part = "UpperTorso", attach = "BodyFrontAttachment", shape = "Ball", size = v(0.55), at = v(0, 0.12, -0.5), offset = v(0, 0, -0.08), color = "#C878FF", material = "Neon" },
			{ name = "VoidSpineLeft", part = "UpperTorso", attach = "BodyBackAttachment", shape = "Block", size = v(0.18, 1.7, 0.18), at = v(-0.15, 0.2, 0.5), offset = v(0, 0, 0.1), rot = v(15, 0, 30), fromEnd = "Y", color = "#A050F0", material = "Neon" },
			{ name = "VoidSpineCentre", part = "UpperTorso", attach = "BodyBackAttachment", shape = "Block", size = v(0.2, 2.1, 0.2), at = v(0, 0.25, 0.5), offset = v(0, 0, 0.1), rot = v(15, 0, 0), fromEnd = "Y", color = "#A050F0", material = "Neon" },
			{ name = "VoidSpineRight", part = "UpperTorso", attach = "BodyBackAttachment", shape = "Block", size = v(0.18, 1.7, 0.18), at = v(0.15, 0.2, 0.5), offset = v(0, 0, 0.1), rot = v(15, 0, -30), fromEnd = "Y", color = "#A050F0", material = "Neon" },
		},
		lights = { { part = "UpperTorso", color = "#B060FF", range = 10, brightness = 1.5 } },
	},
	{
		id = "MagmaBrute",
		base = "RedOrc",
		displayName = "Magma Brute",
		quad = 7,
		theme = "Volcanic",
		rosterIndex = 27,
		look = "Heavy: the Red Orc thickened everywhere with big fists, a charcoal CrackedLava body (glowing lava-orange cracks), charcoal-iron pauldrons and chest plate, the red mohawk tinted into a flame crest, the cyclops eye kept glowing, basalt spines with neon lava tips on the back and an orange light.",
		proportions = {
			Head = 0.95,
			UpperTorso = v(1.4, 1.1, 1.4),
			LowerTorso = v(1.35, 1.05, 1.35),
			LeftUpperArm = v(1.35, 1.08, 1.35),
			RightUpperArm = v(1.35, 1.08, 1.35),
			LeftLowerArm = v(1.4, 1.08, 1.4),
			RightLowerArm = v(1.4, 1.08, 1.4),
			Hands = 1.45,
			Legs = v(1.32, 0.95, 1.32),
			Feet = v(1.35, 1.1, 1.35),
		},
		palette = {
			Head = { "#372D28", "CrackedLava" },
			Torso = { "#2D2624", "CrackedLava" },
			Arms = { "#2D2624", "CrackedLava" },
			Hands = { "#282020", "CrackedLava" },
			Legs = { "#2D2624", "CrackedLava" },
			Feet = { "#221C1A", "Basalt" },
		},
		clothing = { Shirt = false, Pants = false },
		remove = { "Droopy Elf Ears", "Orc PolearmAccessory" },
		tint = {
			["Red Mohawk"] = { "#FF8A1A", 1.6 },
			["Alien Cyclops Red Eye"] = { "#FFA040", 1.5 },
			["Orc Right PauldronAccessory"] = { "#4A403C" },
			["Orc Left PauldronAccessory"] = { "#4A403C" },
			["Orc Chest ArmourAccessory"] = { "#4A403C" },
		},
		build = {
			{
				name = "MagmaSpineLeft", part = "UpperTorso", attach = "BodyBackAttachment", shape = "Block",
				size = v(0.38, 1.2, 0.38), at = v(-0.25, 0.3, 0.5), offset = v(0, 0, 0.05), rot = v(35, 0, 25), fromEnd = "Y",
				color = "#2A2220", material = "Basalt",
				tip = { shape = "Ball", size = v(0.42), color = "#FF7A1A", material = "Neon" },
			},
			{
				name = "MagmaSpineCentre", part = "UpperTorso", attach = "BodyBackAttachment", shape = "Block",
				size = v(0.42, 1.4, 0.42), at = v(0, 0.35, 0.5), offset = v(0, 0, 0.05), rot = v(35, 0, 0), fromEnd = "Y",
				color = "#2A2220", material = "Basalt",
				tip = { shape = "Ball", size = v(0.46), color = "#FF7A1A", material = "Neon" },
			},
			{
				name = "MagmaSpineRight", part = "UpperTorso", attach = "BodyBackAttachment", shape = "Block",
				size = v(0.38, 1.2, 0.38), at = v(0.25, 0.3, 0.5), offset = v(0, 0, 0.05), rot = v(35, 0, -25), fromEnd = "Y",
				color = "#2A2220", material = "Basalt",
				tip = { shape = "Ball", size = v(0.42), color = "#FF7A1A", material = "Neon" },
			},
		},
		lights = { { part = "UpperTorso", color = "#FF7A1A", range = 10, brightness = 2 } },
	},
	{
		id = "IronChampion",
		base = "BuffNoob",
		displayName = "Iron Champion",
		quad = 8,
		theme = "Neon Arena",
		rosterIndex = 31,
		look = "Champion boxer: Buffnoob's muscle body with its textures stripped and plated in steel (DiamondPlate chest, Metal limbs), navy trunks, oversized red gloves, the Knight's steel pauldrons, and a gold title belt with a big gold front plate and a neon-cyan gem.",
		proportions = {
			Head = 1.0,
			UpperTorso = v(1.15, 1.05, 1.12),
			LowerTorso = v(1.1, 1.0, 1.1),
			Arms = v(1.15, 1.05, 1.15),
			Hands = v(1.45, 1.15, 1.4),
			Legs = v(1.1, 1.0, 1.1),
			Feet = 1.05,
		},
		stripTextures = true,
		palette = {
			Head = { "#9BA0AA", "Metal" },
			UpperTorso = { "#828892", "DiamondPlate" },
			LowerTorso = { "#18245A", "Fabric" },
			Arms = { "#969BA5", "Metal" },
			Hands = { "#BE141E", "SmoothPlastic" },
			Legs = { "#8C919B", "Metal" },
			Feet = { "#373A42", "Metal" },
		},
		transplant = {
			{ from = "Knight", name = "Meshes/SteelArmor_Cube.183_Cube.217Accessory", as = "Steel Pauldron Right" },
			{ from = "Knight", name = "Meshes/SteelArmor_Cube.186_Cube.227Accessory", as = "Steel Pauldron Left" },
		},
		build = {
			{ name = "TitleBeltStrap", part = "LowerTorso", attach = "WaistCenterAttachment", shape = "Block", sizeOfPart = v(1.02, 0, 1.04), size = v(0, 0.45, 0), at = v(0, 0.12, 0), color = "#C8A028", material = "Metal" },
			{ name = "TitleBeltPlate", part = "LowerTorso", attach = "WaistFrontAttachment", shape = "Block", size = v(1.0, 0.66, 0.14), at = v(0, 0.12, -0.5), offset = v(0, 0, -0.09), color = "#F0C846", material = "Foil" },
			{ name = "TitleBeltGem", part = "LowerTorso", attach = "WaistFrontAttachment", shape = "Ball", size = v(0.28), at = v(0, 0.12, -0.5), offset = v(0, 0, -0.17), color = "#28E6FF", material = "Neon" },
		},
	},
}

-- ---------------------------------------------------------------------------- R15 shape
local R15_PARTS = {
	"Head", "UpperTorso", "LowerTorso",
	"LeftUpperArm", "LeftLowerArm", "LeftHand", "RightUpperArm", "RightLowerArm", "RightHand",
	"LeftUpperLeg", "LeftLowerLeg", "LeftFoot", "RightUpperLeg", "RightLowerLeg", "RightFoot",
}
-- (joint, Part0, Part1), parents first; the Motor6D lives in Part1.
local R15_JOINTS = {
	{ "Root", "HumanoidRootPart", "LowerTorso" },
	{ "Waist", "LowerTorso", "UpperTorso" },
	{ "Neck", "UpperTorso", "Head" },
	{ "LeftShoulder", "UpperTorso", "LeftUpperArm" },
	{ "LeftElbow", "LeftUpperArm", "LeftLowerArm" },
	{ "LeftWrist", "LeftLowerArm", "LeftHand" },
	{ "RightShoulder", "UpperTorso", "RightUpperArm" },
	{ "RightElbow", "RightUpperArm", "RightLowerArm" },
	{ "RightWrist", "RightLowerArm", "RightHand" },
	{ "LeftHip", "LowerTorso", "LeftUpperLeg" },
	{ "LeftKnee", "LeftUpperLeg", "LeftLowerLeg" },
	{ "LeftAnkle", "LeftLowerLeg", "LeftFoot" },
	{ "RightHip", "LowerTorso", "RightUpperLeg" },
	{ "RightKnee", "RightUpperLeg", "RightLowerLeg" },
	{ "RightAnkle", "RightLowerLeg", "RightFoot" },
}
local GROUPS = {
	Torso = { "UpperTorso", "LowerTorso" },
	Arms = { "LeftUpperArm", "LeftLowerArm", "RightUpperArm", "RightLowerArm" },
	Hands = { "LeftHand", "RightHand" },
	Legs = { "LeftUpperLeg", "LeftLowerLeg", "RightUpperLeg", "RightLowerLeg" },
	Feet = { "LeftFoot", "RightFoot" },
}
local SCALE_VALUES = { "BodyWidthScale", "BodyHeightScale", "BodyDepthScale", "HeadScale" }
local FEET = { "LeftFoot", "RightFoot" }

-- ---------------------------------------------------------------------------- helpers
local function fail(id: string, message: string): never
	error(`{id}: {message}`, 0)
end

local function hex(s: string)
	assert(s:match("^#%x%x%x%x%x%x$"), `bad colour {s}`)
	return Color3.fromRGB(tonumber(s:sub(2, 3), 16), tonumber(s:sub(4, 5), 16), tonumber(s:sub(6, 7), 16))
end

local function material(id: string, name: string)
	local ok, item = pcall(function()
		return (Enum.Material :: any)[name]
	end)
	if not ok or item == nil then
		fail(id, `unknown material {name}`)
	end
	return item
end

local function vmul(a, b)
	return Vector3.new(a.X * b.X, a.Y * b.Y, a.Z * b.Z)
end

local function vdiv(a, b)
	return Vector3.new(a.X / b.X, a.Y / b.Y, a.Z / b.Z)
end

local function asVector(m)
	return if type(m) == "number" then v(m) else m
end

local function rotationOf(cf)
	return cf - cf.Position
end

local function scaleCFrame(cf, m)
	return CFrame.new(vmul(cf.Position, m)) * rotationOf(cf)
end

local function readable(inst, prop: string)
	local ok, value = pcall(function()
		return inst[prop]
	end)
	return if ok then value else nil
end

-- Expand a { Group | PartName = value } table to one value per R15 part (part names win).
local function perPart(id: string, spec)
	local out = {}
	if not spec then
		return out
	end
	for key, value in spec do
		local members = GROUPS[key]
		if members then
			for _, name in members do
				if out[name] == nil then
					out[name] = value
				end
			end
		elseif table.find(R15_PARTS, key) == nil then
			fail(id, `unknown part or group "{key}"`)
		end
	end
	for key, value in spec do
		if not GROUPS[key] then
			out[key] = value
		end
	end
	return out
end

local function loadPrefab(id: string)
	local path = `{GIANTS_DIR}/{id}.rbxm`
	if not fs.isFile(path) then
		fail(id, `no prefab at {path}`)
	end
	local instances = roblox.deserializeModel(fs.readFile(path))
	assert(#instances == 1 and instances[1].ClassName == "Model", `{path}: expected one Model`)
	return instances[1]
end

local function bodyAttachments(model)
	local out = {}
	for _, part in model:GetChildren() do
		if part:IsA("BasePart") then
			for _, a in part:GetChildren() do
				if a:IsA("Attachment") and out[a.Name] == nil then
					out[a.Name] = { part = part, attachment = a }
				end
			end
		end
	end
	return out
end

local function handleOf(accessory)
	return accessory:FindFirstChild("Handle") or accessory:FindFirstChildWhichIsA("BasePart")
end

local function isLayered(handle)
	return handle:FindFirstChildOfClass("WrapLayer") ~= nil
end

-- The handle attachment that pairs with a body attachment, and that body attachment.
local function accessoryPair(model, accessory)
	local handle = handleOf(accessory)
	local body = bodyAttachments(model)
	for _, a in handle:GetChildren() do
		if a:IsA("Attachment") and body[a.Name] then
			return handle, a, body[a.Name].part, body[a.Name].attachment
		end
	end
	return handle, nil, nil, nil
end

-- ---------------------------------------------------------------------------- asset ids
local reflection = roblox.getReflectionDatabase()
local contentPropsCache = {}

local function contentProps(className: string)
	local cached = contentPropsCache[className]
	if cached then
		return cached
	end
	local names = {}
	local class = reflection:GetClass(className)
	while class do
		for name, prop in class.Properties do
			if prop.Datatype == "Content" or prop.Datatype == "ContentId" then
				table.insert(names, name)
			end
		end
		class = if class.Superclass then reflection:GetClass(class.Superclass) else nil
	end
	contentPropsCache[className] = names
	return names
end

-- Every asset id an instance tree references, as a set of id strings.
local function assetIds(root)
	local ids = {}
	local all = root:GetDescendants()
	table.insert(all, root)
	for _, inst in all do
		for _, prop in contentProps(inst.ClassName) do
			local value = readable(inst, prop)
			if value ~= nil then
				local text = tostring(value)
				for id in text:gmatch("(%d%d%d%d%d+)") do
					ids[id] = true
				end
			end
		end
	end
	return ids
end

-- ---------------------------------------------------------------------------- reshape
-- Multiply a body part by m in its own axes, keeping the avatar-scaling bookkeeping
-- (OriginalSize, OriginalPosition, a SpecialMesh's stored values) proportional.
local function reshapePart(part, m)
	part.Size = vmul(part.Size, m)
	for _, child in part:GetChildren() do
		if child:IsA("Attachment") then
			child.CFrame = scaleCFrame(child.CFrame, m)
			for _, value in child:GetChildren() do
				if value:IsA("Vector3Value") and value.Name == "OriginalPosition" then
					value.Value = vmul(value.Value, m)
				end
			end
		elseif child:IsA("Vector3Value") and child.Name == "OriginalSize" then
			child.Value = vmul(child.Value, m)
		elseif child:IsA("SpecialMesh") then
			child.Scale = vmul(child.Scale, m)
			child.Offset = vmul(child.Offset, m)
			for _, value in child:GetChildren() do
				if value:IsA("Vector3Value") then
					value.Value = vmul(value.Value, m)
				end
			end
		end
	end
end

-- Uniformly scale a rigid accessory handle; layered clothing is never resized.
local function scaleHandle(handle, s: number)
	if s == 1 or isLayered(handle) then
		return
	end
	reshapePart(handle, v(s))
	for _, d in handle:GetDescendants() do
		-- Trail attachments and the like live below the handle's own attachments.
		if d:IsA("Attachment") and d.Parent ~= handle then
			d.CFrame = scaleCFrame(d.CFrame, v(s))
		end
	end
end

local function tintAccessory(id: string, accessory, spec)
	local color = hex(spec[1])
	local glow = spec[2] or 1
	local handle = handleOf(accessory)
	local mesh = handle:FindFirstChildOfClass("SpecialMesh")
	local surface = handle:FindFirstChildOfClass("SurfaceAppearance")
	if mesh then
		mesh.VertexColor = Vector3.new(color.R * glow, color.G * glow, color.B * glow)
	elseif surface then
		surface.Color = color
	else
		handle.Color = color
	end
	if glow ~= 1 and not mesh then
		fail(id, `{accessory.Name}: glow only applies to SpecialMesh accessories`)
	end
end

local function weldAccessory(id: string, model, accessory)
	local handle, handleAtt, part, bodyAtt = accessoryPair(model, accessory)
	if not handle then
		fail(id, `accessory {accessory.Name} has no handle`)
	end
	if not handleAtt then
		fail(id, `accessory {accessory.Name} has no attachment matching the body`)
	end
	-- One weld per handle. Some sources carry a stale duplicate (Knight's HeadWelds) that
	-- would pin the handle to its old offset, or to the donor's body after a transplant.
	for _, joint in handle:GetChildren() do
		if joint:IsA("JointInstance") and not (joint.Name == "AccessoryWeld" and joint:IsA("Weld")) then
			joint:Destroy()
		end
	end
	local weld = handle:FindFirstChild("AccessoryWeld")
	if not (weld and weld:IsA("Weld")) then
		weld = Instance.new("Weld")
		weld.Name = "AccessoryWeld"
		weld.Parent = handle
	end
	weld.Part0 = handle
	weld.Part1 = part
	weld.C0 = handleAtt.CFrame
	weld.C1 = bodyAtt.CFrame
	handle.CFrame = part.CFrame * bodyAtt.CFrame * handleAtt.CFrame:Inverse()
	handle.Anchored = false
	handle.CanCollide = false
	handle.Massless = true
end

local function newAccentPart(id: string, spec)
	local part = Instance.new("Part")
	part.Name = "Handle"
	local shape = spec.shape or "Block"
	part.Shape = (Enum.PartType :: any)[shape]
	part.Size = spec.size
	part.Color = hex(spec.color)
	part.Material = material(id, spec.material or "SmoothPlastic")
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.CanCollide = false
	part.CanTouch = false
	part.CanQuery = false
	part.Massless = true
	part.Anchored = false
	local original = Instance.new("Vector3Value")
	original.Name = "OriginalSize"
	original.Value = part.Size
	original.Parent = part
	return part
end

-- An accent Accessory whose handle sits at `local` (part space) on body part `part`,
-- attached through the body attachment `attach`.
local function addAccent(id: string, model, name: string, partName: string, attach: string, spec, placement)
	local body = model:FindFirstChild(partName)
	local bodyAtt = body and body:FindFirstChild(attach)
	if not (bodyAtt and bodyAtt:IsA("Attachment")) then
		fail(id, `accent {name}: {partName} has no {attach}`)
	end
	local accessory = Instance.new("Accessory")
	accessory.Name = name
	local handle = newAccentPart(id, spec)
	handle.Parent = accessory
	local handleAtt = Instance.new("Attachment")
	handleAtt.Name = attach
	-- handle = body * bodyAtt * handleAtt^-1 = body * placement
	handleAtt.CFrame = placement:Inverse() * bodyAtt.CFrame
	local original = Instance.new("Vector3Value")
	original.Name = "OriginalPosition"
	original.Value = handleAtt.CFrame.Position
	original.Parent = handleAtt
	handleAtt.Parent = handle
	accessory.Parent = model
	weldAccessory(id, model, accessory)
end

local function buildAccent(id: string, model, spec)
	local body = model:FindFirstChild(spec.part)
	if not body then
		fail(id, `accent {spec.name}: no part {spec.part}`)
	end
	local size = spec.size or v(0)
	if spec.sizeOfPart then
		size = vmul(body.Size, spec.sizeOfPart) + size
	end
	local rot = spec.rot or v(0)
	local base = CFrame.new(vmul(body.Size, spec.at or v(0)) + (spec.offset or v(0)))
		* CFrame.Angles(math.rad(rot.X), math.rad(rot.Y), math.rad(rot.Z))
	local along = Vector3.new(0, 0, 0)
	if spec.fromEnd == "X" then
		along = Vector3.new(size.X / 2, 0, 0)
	elseif spec.fromEnd == "Y" then
		along = Vector3.new(0, size.Y / 2, 0)
	elseif spec.fromEnd ~= nil then
		fail(id, `accent {spec.name}: fromEnd must be "X" or "Y"`)
	end
	local partSpec = table.clone(spec)
	partSpec.size = size
	addAccent(id, model, spec.name, spec.part, spec.attach, partSpec, base * CFrame.new(along))
	if spec.tip then
		local tipSpec = table.clone(spec.tip)
		addAccent(id, model, spec.name .. "Tip", spec.part, spec.attach, tipSpec, base * CFrame.new(along * 2))
	end
end

-- ---------------------------------------------------------------------------- rest pose
-- Re-solve every body part from the joint chain (HRP at the origin), then lift the rig
-- so the feet rest on y = 0. Returns HipHeight and the body height.
local function solveAndPlace(model)
	local hrp = model.HumanoidRootPart
	local cfs = { HumanoidRootPart = CFrame.new() }
	for _, joint in R15_JOINTS do
		local name, p0, p1 = joint[1], joint[2], joint[3]
		local a0 = model[p0]:FindFirstChild(name .. "RigAttachment")
		local a1 = model[p1]:FindFirstChild(name .. "RigAttachment")
		cfs[p1] = cfs[p0] * a0.CFrame * a1.CFrame:Inverse()
	end
	local function bottomTop(cf, size)
		local _, _, _, r00, r01, r02, r10, r11, r12 = cf:GetComponents()
		local ey = math.abs(r10) * size.X / 2 + math.abs(r11) * size.Y / 2 + math.abs(r12) * size.Z / 2
		return cf.Position.Y - ey, cf.Position.Y + ey
	end
	local ground, top = math.huge, -math.huge
	for _, name in FEET do
		ground = math.min(ground, (bottomTop(cfs[name], model[name].Size)))
	end
	for _, name in R15_PARTS do
		local _, t = bottomTop(cfs[name], model[name].Size)
		top = math.max(top, t)
	end
	local lift = CFrame.new(0, -ground, 0)
	for name, cf in cfs do
		model[name].CFrame = lift * cf
	end
	return -hrp.Size.Y / 2 - ground, top - ground
end

-- ---------------------------------------------------------------------------- derive
local function derive(variant, prefabs)
	local id = variant.id
	local model = prefabs[variant.base]:Clone()
	model.Name = id

	-- Body textures, colours and materials.
	local palette = perPart(id, variant.palette)
	for _, name in R15_PARTS do
		local part = model:FindFirstChild(name)
		if not (part and part:IsA("BasePart")) then
			fail(id, `base {variant.base} has no body part {name}`)
		end
		if variant.stripTextures then
			if part:IsA("MeshPart") then
				part.TextureContent = Content.none
			end
			local mesh = part:FindFirstChildOfClass("SpecialMesh")
			if mesh then
				mesh.TextureContent = Content.none
			end
		end
		local paint = palette[name]
		if paint then
			part.Color = hex(paint[1])
			part.Material = material(id, paint[2])
		end
	end
	-- BodyColors would repaint the limbs per group on load; the palette is per part.
	for _, child in model:GetChildren() do
		if child:IsA("BodyColors") then
			child:Destroy()
		end
	end
	for className, spec in variant.clothing or {} do
		local found = false
		for _, child in model:GetChildren() do
			if child.ClassName == className then
				found = true
				if spec == false then
					child:Destroy()
				else
					child.Color3 = hex(spec)
				end
			end
		end
		if not found then
			fail(id, `base {variant.base} wears no {className}`)
		end
	end

	-- Accessories: remove, transplant, tint.
	for _, name in variant.remove or {} do
		local accessory = model:FindFirstChild(name)
		if not (accessory and accessory:IsA("Accessory")) then
			fail(id, `remove: base {variant.base} has no accessory "{name}"`)
		end
		accessory:Destroy()
	end
	local tints = table.clone(variant.tint or {})
	local scales = table.clone(variant.scale or {})
	for _, t in variant.transplant or {} do
		local donor = prefabs[t.from]
		local accessory = donor and donor:FindFirstChild(t.name)
		if not (accessory and accessory:IsA("Accessory")) then
			fail(id, `transplant: {t.from} has no accessory "{t.name}"`)
		end
		local copy = accessory:Clone()
		copy.Name = t.as or t.name
		if model:FindFirstChild(copy.Name) then
			fail(id, `transplant: an accessory named "{copy.Name}" already exists`)
		end
		-- Catalog thumbnail settings point back into the donor; they mean nothing here.
		for _, d in copy:GetDescendants() do
			if d:IsA("Configuration") and d.Name == "ThumbnailConfiguration" then
				d:Destroy()
			end
		end
		copy.Parent = model
		if t.tint then
			tints[copy.Name] = t.tint
		end
		if t.scale then
			scales[copy.Name] = t.scale
		end
	end
	for name, spec in tints do
		local accessory = model:FindFirstChild(name)
		if not (accessory and accessory:IsA("Accessory")) then
			fail(id, `tint: no accessory "{name}"`)
		end
		tintAccessory(id, accessory, spec)
	end
	for name in scales do
		if not model:FindFirstChild(name) then
			fail(id, `scale: no accessory "{name}"`)
		end
	end

	-- Proportions. Rigid accessories follow the part they hang on unless told otherwise;
	-- which part that is must be read before the attachments move.
	local proportions = perPart(id, variant.proportions)
	local hangsOn = {}
	for _, accessory in model:GetChildren() do
		if accessory:IsA("Accessory") then
			local _, handleAtt, part = accessoryPair(model, accessory)
			if not handleAtt then
				fail(id, `accessory {accessory.Name} has no attachment matching the body`)
			end
			hangsOn[accessory] = part.Name
		end
	end
	for name, m in proportions do
		reshapePart(model[name], asVector(m))
	end
	for accessory, partName in hangsOn do
		local s = scales[accessory.Name]
		if s == nil then
			local m = asVector(proportions[partName] or 1)
			s = (m.X + m.Y + m.Z) / 3
		end
		scaleHandle(handleOf(accessory), s)
	end

	-- Joints from the (moved) rig attachments, then the rest pose and every weld.
	for _, joint in R15_JOINTS do
		local name, p0, p1 = joint[1], joint[2], joint[3]
		local part0, part1 = model[p0], model[p1]
		local a0 = part0:FindFirstChild(name .. "RigAttachment")
		local a1 = part1:FindFirstChild(name .. "RigAttachment")
		if not (a0 and a1) then
			fail(id, `{name}: missing {name}RigAttachment on {p0} or {p1}`)
		end
		local motor = part1:FindFirstChild(name)
		if not (motor and motor:IsA("Motor6D")) then
			fail(id, `missing Motor6D {name} in {p1}`)
		end
		motor.Part0 = part0
		motor.Part1 = part1
		motor.C0 = a0.CFrame
		motor.C1 = a1.CFrame
	end
	local hipHeight, height = solveAndPlace(model)
	for _, accessory in model:GetChildren() do
		if accessory:IsA("Accessory") then
			weldAccessory(id, model, accessory)
		end
	end
	-- Accents go on after the pose: they are placed against the reshaped parts.
	for _, spec in variant.build or {} do
		buildAccent(id, model, spec)
	end
	for _, light in variant.lights or {} do
		local p = Instance.new("PointLight")
		p.Color = hex(light.color)
		p.Range = light.range
		p.Brightness = light.brightness
		p.Shadows = false
		p.Parent = model[light.part]
	end

	local humanoid = model:FindFirstChildOfClass("Humanoid")
	humanoid.HipHeight = hipHeight
	model.PrimaryPart = model.HumanoidRootPart
	for _, part in model:GetDescendants() do
		if part:IsA("BasePart") then
			part.Anchored = false
		end
	end
	for name in model:GetAttributes() do
		model:SetAttribute(name, nil)
	end
	model:SetAttribute("DisplayName", variant.displayName)
	model:SetAttribute("Height", math.round(height * 100) / 100)
	model:SetAttribute("RosterIndex", variant.rosterIndex)
	model:SetAttribute("Zone", variant.quad)
	model:SetAttribute("Theme", variant.theme)
	model:SetAttribute("Source", "derived:" .. variant.base)
	return model, height
end

-- ---------------------------------------------------------------------------- validate
local EPS = 1e-3

local function near(a, b, eps: number?)
	return (a - b).Magnitude <= (eps or EPS)
end

local function nearCFrame(a, b)
	local d = a:Inverse() * b
	return d.Position.Magnitude <= EPS
		and (d.LookVector - Vector3.new(0, 0, -1)).Magnitude <= EPS
		and (d.UpVector - Vector3.new(0, 1, 0)).Magnitude <= EPS
end

-- Size / OriginalSize per body part: a reshape must keep the engine's ratio unchanged.
local function bookkeepingRatios(model)
	local out = {}
	for _, name in R15_PARTS do
		local part = model[name]
		local original = part:FindFirstChild("OriginalSize")
		if original then
			out[name] = vdiv(part.Size, original.Value)
		end
	end
	return out
end

local function validate(variant, model, baseRatios, allowedIds)
	local id = variant.id
	local problems = {}
	local function problem(s: string)
		table.insert(problems, s)
	end

	local hrp = model:FindFirstChild("HumanoidRootPart")
	if not (hrp and hrp:IsA("BasePart")) then
		fail(id, "missing HumanoidRootPart")
	end
	for _, name in R15_PARTS do
		local part = model:FindFirstChild(name)
		if not (part and part:IsA("BasePart")) then
			fail(id, `missing body part {name}`)
		end
	end
	if model.PrimaryPart ~= hrp then
		problem("PrimaryPart is not the HumanoidRootPart")
	end

	-- Joints: wired, equal to their attachments, and consistent with the stored pose.
	for _, joint in R15_JOINTS do
		local name, p0, p1 = joint[1], joint[2], joint[3]
		local part0, part1 = model[p0], model[p1]
		local motor = part1:FindFirstChild(name)
		if not (motor and motor:IsA("Motor6D")) then
			problem(`missing Motor6D {name}`)
			continue
		end
		if motor.Part0 ~= part0 or motor.Part1 ~= part1 then
			problem(`Motor6D {name} not wired {p0} -> {p1}`)
			continue
		end
		local a0 = part0:FindFirstChild(name .. "RigAttachment")
		local a1 = part1:FindFirstChild(name .. "RigAttachment")
		if not (a0 and a1) then
			problem(`{name}: rig attachments missing`)
			continue
		end
		if not nearCFrame(motor.C0, a0.CFrame) or not nearCFrame(motor.C1, a1.CFrame) then
			problem(`Motor6D {name} C0/C1 differ from its rig attachments`)
		end
		if not nearCFrame(part0.CFrame * motor.C0, part1.CFrame * motor.C1) then
			problem(`Motor6D {name}: {p1} is not where the joint puts it`)
		end
	end

	-- Humanoid.
	local humanoid = model:FindFirstChildOfClass("Humanoid")
	if not humanoid then
		fail(id, "no Humanoid")
	end
	if humanoid.RigType ~= Enum.HumanoidRigType.R15 then
		problem("Humanoid.RigType is not R15")
	end
	if not humanoid:FindFirstChildOfClass("Animator") then
		problem("no Animator")
	end
	for _, name in SCALE_VALUES do
		local value = humanoid:FindFirstChild(name)
		if not (value and value:IsA("NumberValue")) then
			problem(`no {name}`)
		elseif math.abs(value.Value - 1) > 1e-4 then
			problem(`{name} = {value.Value}, expected 1`)
		end
	end

	-- Standing: feet on y = 0, HRP where HipHeight says, centred.
	local feet = math.huge
	for _, name in FEET do
		local part = model[name]
		feet = math.min(feet, part.CFrame.Position.Y - part.Size.Y / 2)
	end
	if math.abs(feet) > EPS then
		problem(string.format("feet at y = %.4f, expected 0", feet))
	end
	local expectedRoot = humanoid.HipHeight + hrp.Size.Y / 2
	if not near(hrp.CFrame.Position, Vector3.new(0, expectedRoot, 0)) then
		problem(`HumanoidRootPart at {hrp.CFrame.Position}, expected (0, {expectedRoot}, 0)`)
	end
	if humanoid.HipHeight <= 0 then
		problem(`HipHeight {humanoid.HipHeight}`)
	end
	local height = model:GetAttribute("Height")
	if type(height) ~= "number" or height < 3 or height > 9 then
		problem(`Height attribute {height} out of range`)
	end

	-- Bookkeeping kept proportional.
	local ratios = bookkeepingRatios(model)
	for name, ratio in baseRatios do
		if not ratios[name] then
			problem(`{name} lost its OriginalSize`)
		elseif not near(ratios[name], ratio, 1e-3) then
			problem(`{name}: Size / OriginalSize changed from {ratio} to {ratios[name]}`)
		end
	end

	-- Everything else in the tree.
	for _, d in model:GetDescendants() do
		if d:IsA("LuaSourceContainer") or d:IsA("Sound") or d:IsA("HumanoidDescription") then
			problem(`leftover {d.ClassName} {d.Name}`)
		end
		if d:IsA("BasePart") and d.Anchored then
			problem(`{d.Name} is anchored`)
		end
		if d:IsA("JointInstance") and (d.Part0 == nil or d.Part1 == nil or not d.Part0:IsDescendantOf(model) or not d.Part1:IsDescendantOf(model)) then
			problem(`{d.ClassName} {d:GetFullName()} has a dangling part`)
		end
		if d:IsA("ObjectValue") and d.Value ~= nil and not d.Value:IsDescendantOf(model) then
			problem(`ObjectValue {d:GetFullName()} points outside the giant`)
		end
	end
	for _, accessory in model:GetChildren() do
		if not accessory:IsA("Accessory") then
			continue
		end
		local handle, handleAtt, part, bodyAtt = accessoryPair(model, accessory)
		if not handle or not handleAtt then
			problem(`accessory {accessory.Name} has no attachment pair`)
			continue
		end
		local weld = handle:FindFirstChild("AccessoryWeld")
		if not (weld and weld:IsA("Weld")) or weld.Part0 ~= handle or weld.Part1 ~= part then
			problem(`accessory {accessory.Name} is not welded to {part.Name}`)
		elseif not nearCFrame(handle.CFrame * weld.C0, part.CFrame * weld.C1) then
			problem(`accessory {accessory.Name} is not where its weld puts it`)
		end
		if handle.CanCollide or not handle.Massless then
			problem(`accessory {accessory.Name} handle collides or has mass`)
		end
		if isLayered(handle) then
			local initial = readable(handle, "InitialSize")
			if initial == nil or not near(handle.Size, initial, 1e-4) then
				problem(`layered clothing {accessory.Name} is not at its mesh size`)
			end
		end
	end

	-- Attributes.
	local expected = {
		DisplayName = variant.displayName,
		RosterIndex = variant.rosterIndex,
		Zone = variant.quad,
		Theme = variant.theme,
		Source = "derived:" .. variant.base,
	}
	for name, value in expected do
		if model:GetAttribute(name) ~= value then
			problem(`attribute {name} = {model:GetAttribute(name)}, expected {value}`)
		end
	end

	-- No asset the imported prefabs did not already carry.
	for assetId in assetIds(model) do
		if not allowedIds[assetId] then
			problem(`references asset {assetId}, which no imported prefab uses`)
		end
	end

	if #problems > 0 then
		fail(id, "contract broken:\n  " .. table.concat(problems, "\n  "))
	end
end

-- ---------------------------------------------------------------------------- roster doc
local DOC_START = "<!-- derived-giants:start (generated by tools/giants/derive_giants.luau) -->"
local DOC_END = "<!-- derived-giants:end -->"

local function markdownTable(header, rows)
	local widths = {}
	for i, cell in header do
		widths[i] = math.max(3, utf8.len(cell))
	end
	for _, row in rows do
		for i, cell in row do
			widths[i] = math.max(widths[i], utf8.len(cell))
		end
	end
	local function line(cells)
		local out = {}
		for i, cell in cells do
			table.insert(out, cell .. string.rep(" ", widths[i] - utf8.len(cell)))
		end
		return "| " .. table.concat(out, " | ") .. " |"
	end
	local lines = { line(header) }
	local dashes = {}
	for i in header do
		dashes[i] = string.rep("-", widths[i])
	end
	table.insert(lines, line(dashes))
	for _, row in rows do
		table.insert(lines, line(row))
	end
	return table.concat(lines, "\n")
end

local function writeRosterSection(results)
	local rows = {}
	for _, r in results do
		table.insert(rows, {
			"`" .. r.variant.id .. "`",
			r.variant.displayName,
			string.format("%.1f", r.height),
			`{r.variant.quad} ({r.variant.theme})`,
			tostring(r.variant.rosterIndex),
			tostring(r.accessories),
			"`" .. r.variant.base .. "`",
		})
	end
	local looks = {}
	for _, r in results do
		table.insert(looks, `- **{r.variant.displayName}** (\`{r.variant.id}\`): {r.variant.look}`)
	end
	local section = table.concat({
		DOC_START,
		"",
		"## Derived giants",
		"",
		"Made from the prefabs above by `tools/giants/derive_giants.luau` (the `VARIANTS` table at its top):",
		"recoloured, reshaped per body part, accessories moved between giants, accents built from plain Parts",
		"with engine materials, no new asset ids. Same contract as the imported giants. To change one, edit",
		"`VARIANTS` and run `lune run tools/giants/derive_giants.luau` from the repo root; it rewrites the",
		"`.rbxm` files and this section, and fails without writing anything if a giant breaks the contract.",
		"Re-run it after `import_giants.py`, which rewrites this file and the base prefabs. For these giants",
		"_Zone_ is the staircase quad and _RosterIndex_ the 1-based place on the staircase",
		"(`docs/giant-quads.md`); `tools/giants/checks/derived-giants-probe.luau` checks them in-engine.",
		"",
		markdownTable({ "Id", "Display name", "Height", "Quad", "RosterIndex", "Accessories", "Derived from" }, rows),
		"",
		table.concat(looks, "\n"),
		"",
		DOC_END,
	}, "\n")

	local doc = fs.readFile(ROSTER_DOC)
	local s = doc:find(DOC_START, 1, true)
	local e = doc:find(DOC_END, 1, true)
	if s and e then
		doc = doc:sub(1, s - 1) .. section .. doc:sub(e + #DOC_END)
	else
		doc = doc:gsub("%s+$", "") .. "\n\n" .. section .. "\n"
	end
	fs.writeFile(ROSTER_DOC, doc)
end

-- ---------------------------------------------------------------------------- main
local function main()
	if not fs.isDir(GIANTS_DIR) then
		error(`run from the repo root: no {GIANTS_DIR}`, 0)
	end
	local derivedIds = {}
	for _, variant in VARIANTS do
		assert(not derivedIds[variant.id], `duplicate variant {variant.id}`)
		derivedIds[variant.id] = true
	end

	-- Every imported prefab (never a previous derived output) is a possible base or donor,
	-- and together they define which asset ids an output may reference.
	local prefabs = {}
	local allowedIds = {}
	for _, file in fs.readDir(GIANTS_DIR) do
		local prefabId = file:match("^(.+)%.rbxm$")
		if prefabId and not derivedIds[prefabId] then
			prefabs[prefabId] = loadPrefab(prefabId)
			for assetId in assetIds(prefabs[prefabId]) do
				allowedIds[assetId] = true
			end
		end
	end

	-- Build and validate everything before writing anything.
	local results = {}
	for _, variant in VARIANTS do
		if not prefabs[variant.base] then
			fail(variant.id, `base prefab {variant.base} not found in {GIANTS_DIR}`)
		end
		if derivedIds[variant.base] then
			fail(variant.id, "a derived giant cannot be the base of another")
		end
		local baseRatios = bookkeepingRatios(prefabs[variant.base])
		local model, height = derive(variant, prefabs)
		validate(variant, model, baseRatios, allowedIds)
		-- Round-trip through the binary format and check again: what is written is what is checked.
		local bytes = roblox.serializeModel({ model }, false)
		local reread = roblox.deserializeModel(bytes)
		assert(#reread == 1, `{variant.id}: serialised to {#reread} instances`)
		validate(variant, reread[1], baseRatios, allowedIds)
		local accessories, parts = 0, 0
		for _, d in model:GetDescendants() do
			if d:IsA("Accessory") then
				accessories += 1
			elseif d:IsA("BasePart") then
				parts += 1
			end
		end
		table.insert(results, {
			variant = variant,
			bytes = bytes,
			height = height,
			hipHeight = model:FindFirstChildOfClass("Humanoid").HipHeight,
			accessories = accessories,
			parts = parts,
		})
	end

	for _, r in results do
		fs.writeFile(`{GIANTS_DIR}/{r.variant.id}.rbxm`, r.bytes)
		print(string.format(
			"  %-14s from %-13s h=%.2f hip=%.2f parts=%d accessories=%d (%d KB)",
			r.variant.id, r.variant.base, r.height, r.hipHeight, r.parts, r.accessories, #r.bytes // 1024
		))
	end
	writeRosterSection(results)
	print(`{#results} derived giants -> {GIANTS_DIR}; roster section in {ROSTER_DOC}`)
end

main()
