--[[
	Headless check of the ridge greybox (docs/superpowers/specs/2026-09-26-ridge-prototype-design.md).
	Runs the game place's server scripts, so RidgeService builds the ridge exactly as it does on
	Play, then asserts what it built: every terrace a persistent model, the spawn at the base
	facing up the ridge, each giant sized and standing on its mark, each ramp rising from its
	terrace to the next, no part over the engine's size limit. Then throws the smallest and
	largest giant with the game's own launch code and checks each clears the +X cliff edge.

	    npm run check:ridge

	Plugin-level, Edit mode; see tools/giants/checks/README.md for the run-in-roblox gotchas
	(one Studio at a time, fixed port).
]]
local LogService = game:GetService("LogService")
local RunService = game:GetService("RunService")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")

local TS = ServerScriptService:FindFirstChild("TS")
local ridgeModules = TS and TS:FindFirstChild("features") and TS.features:FindFirstChild("ridge")
if not ridgeModules then
	-- run-in-roblox's plugin is loaded by every open Studio; stay idle in any other place.
	while true do
		task.wait(60)
	end
end

local problems = {}
local function check(condition: boolean, message: string)
	if not condition then
		table.insert(problems, message)
	end
end

-- run-in-roblox exits non-zero when the script errors; ProcessService does not reach it.
local function exit(ok: boolean)
	if not ok then
		error("ridge check failed", 0)
	end
end

local serverLog = {}
LogService.MessageOut:Connect(function(message, messageType)
	table.insert(serverLog, message)
	if messageType == Enum.MessageType.MessageWarning or messageType == Enum.MessageType.MessageError then
		table.insert(problems, "log: " .. message)
	end
end)

-- roblox-ts's RuntimeLib makes every import wait for game.Loaded while RunService:IsClient() is
-- true and running. Edit-mode Run reports IsClient() in a DataModel that never fires Loaded, so
-- every roblox-ts Script would hang silently on its first package import. Drop that wait from
-- this session's copy of RuntimeLib; nothing on disk changes.
local runtimeLib = game:GetService("ReplicatedStorage").rbxts_include.RuntimeLib
local patched, count = runtimeLib.Source:gsub("game%.Loaded:Wait%(%)", "-- skipped by check-ridge: edit-mode Run is never Loaded")
if count ~= 1 then
	error("check-ridge: expected one game.Loaded:Wait() in RuntimeLib, found " .. count, 0)
end
runtimeLib.Source = patched

RunService:Run() -- runs runtime.server: Flamework ignites, RidgeService builds in onInit
local ridge = Workspace:WaitForChild("Ridge", 30)
if not ridge then
	RunService:Stop()
	print("RIDGE FAILED: no Workspace.Ridge after 30 s. Output since Run:")
	for _, message in serverLog do
		print("  | " .. message)
	end
	exit(false)
	return
end
task.wait(2) -- let physics step; anything unanchored by mistake would move

local config = require(ridgeModules["ridge-config"]).RIDGE_CONFIG
local layout = require(ridgeModules["ridge-layout"]).layoutRidge(config)
local launchGiant = require(ridgeModules["ridge-giants"]).launchGiant
local throwVelocity = require(ridgeModules["throw-arc"]).throwVelocity

local terraceCount = 0
local giantCount = 0
for _, terrace in layout.terraces do
	local index = terrace.index
	local name = if index == 0 then "Base" else string.format("Terrace%02d", index)
	local model = ridge:FindFirstChild(name)
	check(model ~= nil and model:IsA("Model"), name .. " missing")
	if not model then
		continue
	end
	terraceCount += 1
	check(model.ModelStreamingMode == Enum.ModelStreamingMode.Persistent, name .. " is not persistent")

	-- Each ramp rises from this terrace's top at its front to the next terrace's top at its back.
	local ramp = model:FindFirstChild("Ramp")
	if index < config.terraceCount then
		check(ramp ~= nil and ramp:IsA("WedgePart"), name .. " has no wedge ramp")
		if ramp then
			local params = RaycastParams.new()
			params.FilterType = Enum.RaycastFilterType.Include
			params.FilterDescendantsInstances = { ramp }
			local function surfaceAt(z: number): number?
				local hit = Workspace:Raycast(Vector3.new(0, 1e4, z), Vector3.new(0, -2e4, 0), params)
				return hit and hit.Position.Y
			end
			local depth = ramp.Size.Z
			local frontY = surfaceAt(ramp.Position.Z - 0.45 * depth)
			local backY = surfaceAt(ramp.Position.Z + 0.45 * depth)
			local nextTop = layout.terraces[index + 2].topY -- Luau arrays are 1-based
			local riser = nextTop - terrace.topY
			check(frontY ~= nil and backY ~= nil, name .. " ramp not hit by raycast")
			if frontY and backY then
				check(backY > frontY, string.format("%s ramp falls toward +Z (front %.1f, back %.1f)", name, frontY, backY))
				check(math.abs(frontY - terrace.topY) < 0.1 * riser, string.format("%s ramp starts at %.1f, top is %.1f", name, frontY, terrace.topY))
				check(math.abs(backY - nextTop) < 0.1 * riser, string.format("%s ramp ends at %.1f, next top is %.1f", name, backY, nextTop))
			end
		end
	else
		check(ramp == nil, name .. " (summit) has a ramp")
	end

	if index == 0 then
		local spawn = model:FindFirstChild("Spawn")
		check(spawn ~= nil and spawn:IsA("SpawnLocation"), "no SpawnLocation at the base")
		if spawn then
			check(spawn.CFrame.LookVector.Z > 0.99, "the spawn does not face up the ridge (+Z)")
		end
		continue
	end

	-- The giant: roster order, sized to the fight, feet on its mark, facing the player at -X.
	local fight = terrace.fight
	local giant = model:FindFirstChild("Giant")
	check(giant ~= nil, name .. " has no giant")
	if not giant then
		continue
	end
	giantCount += 1
	local root = giant.PrimaryPart
	local humanoid = giant:FindFirstChildOfClass("Humanoid")
	check(giant:GetAttribute("RosterIndex") == index, string.format("%s shows RosterIndex %s", name, tostring(giant:GetAttribute("RosterIndex"))))
	local expectedScale = fight.giantHeight / giant:GetAttribute("Height")
	check(math.abs(giant:GetScale() - expectedScale) < 1e-3, string.format("%s giant scale %.3f, expected %.3f", name, giant:GetScale(), expectedScale))
	if root and humanoid then
		local feet = root.Position - Vector3.new(0, humanoid.HipHeight + root.Size.Y / 2, 0)
		local offset = feet - fight.giantMark
		check(offset.Magnitude < 0.05 * fight.giantHeight, string.format("%s giant's feet are %.2f studs off the mark", name, offset.Magnitude))
		check(root.CFrame.LookVector.X < -0.99, name .. " giant does not face -X")
		check(root.Anchored, name .. " giant root is not anchored")
	end
end

local partCount = 0
for _, part in ridge:GetDescendants() do
	if part:IsA("BasePart") then
		partCount += 1
		local size = part.Size
		check(math.max(size.X, size.Y, size.Z) <= 2048, part:GetFullName() .. " exceeds 2048 studs")
	end
end

-- Throw the smallest and largest giant with the game's launch code; each must come down past the +X edge.
local throwReports = {}
for _, index in { 1, config.terraceCount } do
	local terrace = layout.terraces[index + 1]
	local model = ridge:FindFirstChild(string.format("Terrace%02d", index))
	local giant = model and model:FindFirstChild("Giant")
	if not giant then
		continue
	end
	local fight = terrace.fight
	local velocity = throwVelocity(fight.throwDistance, config.throwAngleDegrees, Workspace.Gravity)
	local launched, err = pcall(launchGiant, giant, velocity, config.throwSpin)
	check(launched, string.format("throw %d: launchGiant failed: %s", index, tostring(err)))
	local root = giant.PrimaryPart
	local startedAt = os.clock()
	local peakY = root.Position.Y
	local clearedAt = nil
	while os.clock() - startedAt < 10 do
		task.wait()
		peakY = math.max(peakY, root.Position.Y)
		-- Below the surface can only mean off the terrace; it must be off the +X side.
		if root.Position.Y < terrace.topY - fight.giantHeight then
			clearedAt = os.clock() - startedAt
			check(root.Position.X > terrace.width / 2, string.format("throw %d went down at x=%.1f, the edge is %.1f", index, root.Position.X, terrace.width / 2))
			break
		end
	end
	check(clearedAt ~= nil, string.format("throw %d never left the terrace (root at %s)", index, tostring(root.Position)))
	table.insert(throwReports, string.format("T%d %s: speed %.0f, peak +%.0f, below the edge after %.2f s", index, giant:GetAttribute("DisplayName") or giant.Name, velocity.Magnitude, peakY - terrace.topY, clearedAt or -1))
end

RunService:Stop()

print(string.format("terraces=%d/%d giants=%d/%d parts=%d", terraceCount, #layout.terraces, giantCount, config.terraceCount, partCount))
for _, report in throwReports do
	print("  " .. report)
end
for _, problem in problems do
	print("  PROBLEM " .. problem)
end
print(if #problems == 0 then "RIDGE OK" else string.format("RIDGE FAILED (%d problems)", #problems))
exit(#problems == 0)
