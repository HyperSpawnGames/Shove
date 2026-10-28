-- In-engine check of the giants made by tools/giants/derive_giants.luau, against the game place:
--
--     npm run assemble   (or: rojo build default.project.json -o push-a-giant.rbxl)
--     run-in-roblox --place push-a-giant.rbxl --script tools/giants/checks/derived-giants-probe.luau
--
-- For each derived Id it clones ServerStorage.Giants.<Id> into the workspace the way the game
-- does (root anchored, feet on the floor at y = 0) and reports:
--   height     body height measured from the parts vs the Height attribute
--   feet       lowest foot bottom vs the floor (0)
--   parts/acc  BasePart and Accessory counts
--   joints     the 15 Motor6Ds present, wired, Active, and holding Part1 where C0/C1 put it
--   idle       the default R15 idle (the one giant-models.ts plays) loads, plays and moves joints
--   x2         the same giant sized x2 through the Humanoid's scale values: measured height /
--              (2 x Height) and the feet offset the engine's HipHeight leaves, each compared with
--              its base prefab's own x2 numbers (the engine is not exact on either, even for the
--              imported rigs); every accessory still on its body part
-- The six base prefabs run first as "control" lines (no x2 judgement, they are the reference).
-- Animation is stepped with Animator:StepAnimations (plugin security, which run-in-roblox has), so
-- the place's own scripts never start. Expect clean control lines, one OK line per giant and
-- "derived giants ok=6/6".
-- Close other Studio windows first (checks/README.md: run-in-roblox's plugin loads everywhere).

local ServerStorage = game:GetService("ServerStorage")
local LogService = game:GetService("LogService")

local IDS = { "MosslingScout", "AncientTreant", "YetiWarlord", "VoidTyrant", "MagmaBrute", "IronChampion" }
-- The imported prefab each was derived from (VARIANTS in derive_giants.luau).
local BASES = {
	MosslingScout = "LeafNinja", AncientTreant = "ForestTroll", YetiWarlord = "IceKing",
	VoidTyrant = "ChaosSummoner", MagmaBrute = "RedOrc", IronChampion = "BuffNoob",
}
-- How far a derived giant's x2 height ratio and feet offset (fraction of height) may stray
-- from its base's. Reshaping shifts both slightly (more or less leg in the height).
local X2_TOLERANCE = 0.03
local IDLE = "rbxassetid://507766666"
local SCALE_VALUES = { "BodyWidthScale", "BodyHeightScale", "BodyDepthScale", "HeadScale" }
local R15 = {
	"Head", "UpperTorso", "LowerTorso",
	"LeftUpperArm", "LeftLowerArm", "LeftHand", "RightUpperArm", "RightLowerArm", "RightHand",
	"LeftUpperLeg", "LeftLowerLeg", "LeftFoot", "RightUpperLeg", "RightLowerLeg", "RightFoot",
}
local JOINTS = {
	Root = { "HumanoidRootPart", "LowerTorso" }, Waist = { "LowerTorso", "UpperTorso" }, Neck = { "UpperTorso", "Head" },
	LeftShoulder = { "UpperTorso", "LeftUpperArm" }, LeftElbow = { "LeftUpperArm", "LeftLowerArm" }, LeftWrist = { "LeftLowerArm", "LeftHand" },
	RightShoulder = { "UpperTorso", "RightUpperArm" }, RightElbow = { "RightUpperArm", "RightLowerArm" }, RightWrist = { "RightLowerArm", "RightHand" },
	LeftHip = { "LowerTorso", "LeftUpperLeg" }, LeftKnee = { "LeftUpperLeg", "LeftLowerLeg" }, LeftAnkle = { "LeftLowerLeg", "LeftFoot" },
	RightHip = { "LowerTorso", "RightUpperLeg" }, RightKnee = { "RightUpperLeg", "RightLowerLeg" }, RightAnkle = { "RightLowerLeg", "RightFoot" },
}

local giants = ServerStorage:FindFirstChild("Giants")
if not giants or not giants:FindFirstChild("Noob") then
	-- run-in-roblox's plugin is loaded by every open Studio; stay idle in any other place.
	while true do task.wait(60) end
end

local folder = Instance.new("Folder")
folder.Name = "DerivedGiantsProbe"
folder.Parent = workspace

-- Errors and warnings the engine logs while a giant is being checked.
local logged = {}
local logConnection = LogService.MessageOut:Connect(function(message, messageType)
	if messageType == Enum.MessageType.MessageError or messageType == Enum.MessageType.MessageWarning then
		table.insert(logged, message)
	end
end)

local function bodyExtent(model)
	local bottom, top = math.huge, -math.huge
	for _, name in R15 do
		local part = model[name]
		local cf, size = part.CFrame, part.Size
		local ey = math.abs(cf.RightVector.Y) * size.X / 2 + math.abs(cf.UpVector.Y) * size.Y / 2 + math.abs(cf.LookVector.Y) * size.Z / 2
		top = math.max(top, cf.Position.Y + ey)
		if name == "LeftFoot" or name == "RightFoot" then
			bottom = math.min(bottom, cf.Position.Y - ey)
		end
	end
	return bottom, top
end

local function stand(model, x)
	local humanoid = model:FindFirstChildOfClass("Humanoid")
	local root = model.PrimaryPart
	root.Anchored = true
	model:PivotTo(CFrame.new(x, humanoid.HipHeight + root.Size.Y / 2, 0))
end

-- Joint problems: missing, miswired, inactive, or Part1 away from where the joint puts it.
local function jointProblems(model, tolerance)
	local problems, count = {}, 0
	for name, ends in JOINTS do
		local part0, part1 = model:FindFirstChild(ends[1]), model:FindFirstChild(ends[2])
		local motor = part1 and part1:FindFirstChild(name)
		if not (motor and motor:IsA("Motor6D")) then
			table.insert(problems, "missing Motor6D " .. name)
		elseif motor.Part0 ~= part0 or motor.Part1 ~= part1 then
			table.insert(problems, "Motor6D " .. name .. " miswired")
		elseif not motor.Active then
			table.insert(problems, "Motor6D " .. name .. " inactive")
		else
			local expected = part0.CFrame * motor.C0 * motor.Transform
			local actual = part1.CFrame * motor.C1
			local gap = (expected.Position - actual.Position).Magnitude
			if gap > tolerance then
				table.insert(problems, string.format("%s off its joint by %.3f", name, gap))
			else
				count += 1
			end
		end
	end
	return problems, count
end

-- Accessories whose handle is not held to a body part, or has drifted away from it.
local function accessoryProblems(model, scale)
	local problems = {}
	for _, accessory in model:GetChildren() do
		if not accessory:IsA("Accessory") then continue end
		local handle = accessory:FindFirstChild("Handle")
		-- The AccessoryWeld, or the AccessoryRigidConstraint the engine swaps in for a garment.
		local part
		for _, holder in (handle and handle:GetChildren() or {}) do
			local a, b
			if holder:IsA("JointInstance") then
				a, b = holder.Part0, holder.Part1
			elseif holder:IsA("Constraint") then
				a, b = holder.Attachment0 and holder.Attachment0.Parent, holder.Attachment1 and holder.Attachment1.Parent
			end
			if a == handle and b then part = b elseif b == handle and a then part = a end
			if part then break end
		end
		if not (part and part:IsA("BasePart")) then
			table.insert(problems, "accessory not held: " .. accessory.Name)
		elseif (handle.Position - part.Position).Magnitude > 4 * scale then
			table.insert(problems, string.format("accessory drifted: %s (%.1f studs from %s)", accessory.Name, (handle.Position - part.Position).Magnitude, part.Name))
		end
	end
	return problems
end

local function maxJointAngle(model)
	local best = 0
	for _, d in model:GetDescendants() do
		if d:IsA("Motor6D") then
			local _, angle = d.Transform:ToAxisAngle()
			best = math.max(best, math.abs(angle))
		end
	end
	return math.deg(best)
end

local function probe(id, x, reference)
	local problems = {}
	local function problem(s) table.insert(problems, s) end
	table.clear(logged)

	local prefab = giants:FindFirstChild(id)
	if not prefab then
		return string.format("%-14s MISSING from ServerStorage.Giants", id), { "missing" }
	end
	local model = prefab:Clone()
	model.Parent = folder
	stand(model, x)
	local humanoid = model:FindFirstChildOfClass("Humanoid")
	local animator = humanoid and humanoid:FindFirstChildOfClass("Animator")
	if not animator then
		return string.format("%-14s no Humanoid/Animator", id), { "no animator" }
	end

	-- Standing at 1x.
	local attrHeight = model:GetAttribute("Height")
	local feet, top = bodyExtent(model)
	local height = top - feet
	if math.abs(feet) > 0.02 then problem(string.format("feet at %.3f, expected 0", feet)) end
	if typeof(attrHeight) ~= "number" or math.abs(height - attrHeight) > 0.05 then
		problem(string.format("height %.2f vs Height attribute %s", height, tostring(attrHeight)))
	end
	local parts, accessories = 0, 0
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") then parts += 1 elseif d:IsA("Accessory") then accessories += 1 end
	end
	local jp, jointsOk = jointProblems(model, 0.01)
	for _, p in jp do problem(p) end
	for _, p in accessoryProblems(model, 1) do problem(p) end

	-- Idle.
	local idleNote = "idle not run"
	local ok, err = pcall(function()
		local animation = Instance.new("Animation")
		animation.AnimationId = IDLE
		local track = animator:LoadAnimation(animation)
		track.Looped = true
		track.Priority = Enum.AnimationPriority.Idle
		track:Play()
		local waited = 0
		while track.Length == 0 and waited < 10 do
			waited += task.wait(0.1)
		end
		if track.Length == 0 then error("idle track never loaded") end
		for _ = 1, 8 do animator:StepAnimations(0.1) end
		local angle = maxJointAngle(model)
		idleNote = string.format("idle playing=%s t=%.2f/%.2f maxJoint=%.1fdeg", tostring(track.IsPlaying), track.TimePosition, track.Length, angle)
		if not track.IsPlaying then problem("idle stopped") end
		if angle < 0.2 then problem("idle did not move any joint") end
		track:Stop(0)
		for _ = 1, 2 do animator:StepAnimations(0.1) end
	end)
	if not ok then problem("idle: " .. tostring(err)) end
	local jpAfter = jointProblems(model, 0.05)
	for _, p in jpAfter do problem("after idle: " .. p) end

	-- x2 through the Humanoid's scale values, as the game sizes giants up to 2.5x. The engine
	-- does not double a rig exactly: body-type blending gives ~0.95x the expected height, and
	-- the HipHeight it sets leaves the feet a little off the floor (the imported IceKing and
	-- BuffNoob measure 0.945 and 0.19-0.35 studs). So these two numbers are not judged
	-- absolutely; a derived giant must match its own base prefab's numbers (run first, as a
	-- control) within X2_TOLERANCE, the feet offset taken as a fraction of the giant's height.
	local x2 = nil
	local x2Note = "x2 not run"
	ok, err = pcall(function()
		for _, name in SCALE_VALUES do humanoid[name].Value = 2 end
		-- Let the rescale settle: a frame, and one animation step to re-pose the joints.
		task.wait(0.1)
		animator:StepAnimations(0)
		task.wait()
		stand(model, x)
		local f2, t2 = bodyExtent(model)
		x2 = { ratio = (t2 - f2) / (2 * attrHeight), feet = f2 / (2 * attrHeight) }
		x2Note = string.format("x2 height ratio %.3f feet %.3f (%.3f of height)", x2.ratio, f2, x2.feet)
		if reference then
			if math.abs(x2.ratio - reference.ratio) > X2_TOLERANCE then
				problem(string.format("x2 height ratio %.3f, base %.3f", x2.ratio, reference.ratio))
			end
			if math.abs(x2.feet - reference.feet) > X2_TOLERANCE then
				problem(string.format("x2 feet offset %.3f of height, base %.3f", x2.feet, reference.feet))
			end
		end
		for _, p in accessoryProblems(model, 2) do problem("x2 " .. p) end
		for _, p in (jointProblems(model, 0.02)) do problem("x2 " .. p) end
	end)
	if not ok then problem("x2: " .. tostring(err)) end

	for _, message in logged do
		problem("engine log: " .. message)
	end
	model:Destroy()
	local line = string.format(
		"%-14s height=%.2f (attr %s) feet=%.3f parts=%d acc=%d joints=%d/15 %s %s -> %s",
		id, height, tostring(attrHeight), feet, parts, accessories, jointsOk, idleNote, x2Note,
		#problems == 0 and "OK" or "PROBLEMS"
	)
	return line, problems, x2
end

-- Each derived giant's base prefab goes through the same checks first, as a control and as
-- the x2 reference: if a control fails, the probe or the engine is at fault, not the giant.
local references = {}
for i, id in IDS do
	local base = BASES[id]
	if references[base] == nil then
		local line, problems, x2 = probe(base, -i * 25, nil)
		references[base] = x2 or false
		print("control " .. line)
		for _, p in problems do print("  control problem " .. p) end
	end
end
local passed = 0
for i, id in IDS do
	local reference = references[BASES[id]]
	local line, problems = probe(id, (i - 1) * 25, reference or nil)
	print(line)
	if not reference then table.insert(problems, "no x2 reference: base " .. BASES[id] .. " failed to scale") end
	for _, p in problems do print("  PROBLEM " .. p) end
	if #problems == 0 then passed += 1 end
end
logConnection:Disconnect()
folder:Destroy()
print(string.format("derived giants ok=%d/%d", passed, #IDS))
