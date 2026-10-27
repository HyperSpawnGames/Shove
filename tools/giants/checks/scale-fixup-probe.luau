-- Verifies the game's giant sizing above 2.5x (Model:ScaleTo + the client Transform fix-up)
-- in push-a-giant.rbxl, edit mode:
--   npm run assemble
--   run-in-roblox --place push-a-giant.rbxl --script tools/giants/checks/scale-fixup-probe.luau
-- For Baron at 3x and Ice King at 6x, spawned through the game's own cloneGiant + placeOnFloor:
--   size   body top = Height x k, lowest point of the model on y = 0, feet on it,
--          tagged ScaledGiant with AnimationScale = k
--   probe  the client probe's measurement (copies at 1x and 4x, frozen idle, joint Transform
--          translation ratio) and the verdict of the game's own probeVerdict
--   anim   head displacement under the frozen idle relative to the same giant at 1x:
--          uncorrected (expect k^2 while the engine double-scales) and with the fix-up the
--          probe decided on, using the game's correctedTransform (expect k)
-- The controller wiring itself (tags arriving by streaming, Stepped) needs a playtest.
local RunService = game:GetService("RunService")
local ServerStorage = game:GetService("ServerStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local StarterPlayer = game:GetService("StarterPlayer")
local CollectionService = game:GetService("CollectionService")

local clientTS = StarterPlayer:FindFirstChild("StarterPlayerScripts")
	and StarterPlayer.StarterPlayerScripts:FindFirstChild("TS")
if not (ServerStorage:FindFirstChild("Giants") and ServerScriptService:FindFirstChild("TS") and clientTS) then
	-- run-in-roblox's plugin is loaded by every open Studio; stay idle in any other place.
	while true do task.wait(60) end
end

-- RunService:Run() would start the game's server too; this check wants an empty world.
for _, d in ServerScriptService:GetDescendants() do
	if d:IsA("Script") then d.Enabled = false end
end

local encounterServer = ServerScriptService.TS.features.encounter
local GiantModels = require(encounterServer["giant-models"])
local AnimationScale = require(clientTS.features.encounter["animation-scale"])

local IDLE = "rbxassetid://507766666"
local FREEZE_AT = 0.9
local PROBE_SCALE = 4 -- as GiantScaleController
local R15 = { "Head", "UpperTorso", "LowerTorso", "LeftUpperArm", "LeftLowerArm", "LeftHand", "RightUpperArm",
	"RightLowerArm", "RightHand", "LeftUpperLeg", "LeftLowerLeg", "LeftFoot", "RightUpperLeg", "RightLowerLeg", "RightFoot" }
local CASES = { { id = "Baron", k = 3 }, { id = "IceKing", k = 6 } }

local folder = Instance.new("Folder")
folder.Name = "ScaleFixupProbe"
folder.Parent = workspace

local function definition(id, k)
	return { modelId = id, displayName = id, scale = k, recommendedStrength = 0, resistancePerSecond = 0, winsPayout = 0 }
end

local function spawnGiant(id, k, x)
	local model = GiantModels.cloneGiant(definition(id, k), folder)
	assert(model, "missing prefab " .. id)
	GiantModels.placeOnFloor(model, CFrame.new(x, 0, 0))
	return model
end

local function bodyBounds(model)
	local lo, hi = math.huge, -math.huge
	for _, name in R15 do
		local p = model:FindFirstChild(name)
		if p then
			local half = p.Size / 2
			for _, sx in { -1, 1 } do
				for _, sy in { -1, 1 } do
					for _, sz in { -1, 1 } do
						local y = p.CFrame:PointToWorldSpace(Vector3.new(sx * half.X, sy * half.Y, sz * half.Z)).Y
						lo = math.min(lo, y)
						hi = math.max(hi, y)
					end
				end
			end
		end
	end
	return lo, hi
end

local function freeze(model)
	local animator = model:FindFirstChildOfClass("Humanoid"):FindFirstChildOfClass("Animator")
	local anim = Instance.new("Animation")
	anim.AnimationId = IDLE
	local track = animator:LoadAnimation(anim)
	track.Looped = true
	track:Play(0, 1, 0)
	return track
end

local function settleTracks(tracks)
	local deadline = os.clock() + 10
	for _, t in tracks do
		while t.Length <= 0 and os.clock() < deadline do task.wait() end
		t.TimePosition = FREEZE_AT
		t:AdjustSpeed(0)
	end
	task.wait(1)
end

local function headOffset(model)
	return model.HumanoidRootPart.CFrame:PointToObjectSpace(model.Head.Position)
end

local function jointTranslations(model)
	local lengths = {}
	for _, d in model:GetDescendants() do
		if d:IsA("Motor6D") or d:IsA("AnimationConstraint") then lengths[d.Name] = d.Transform.Position.Magnitude end
	end
	return lengths
end

-- 1. Size and placement, rest pose.
local fails = 0
local function check(ok, msg)
	print((ok and "  ok   " or "  FAIL ") .. msg)
	if not ok then fails += 1 end
end

local rows = {}
for i, case in CASES do
	local x = (i - 1) * 120
	local row = {
		case = case,
		reference = spawnGiant(case.id, 1, x),
		raw = spawnGiant(case.id, case.k, x + 30),
		fixed = spawnGiant(case.id, case.k, x + 30 + 10 * case.k),
	}
	table.insert(rows, row)
	local m = row.fixed
	local height = m:GetAttribute("Height")
	local lo, hi = bodyBounds(m)
	local box, size = m:GetBoundingBox()
	-- Height is measured from the prefab's lowest point, which placeOnFloor puts on y = 0.
	print(string.format("%s x%g: GetScale=%.3g body top y=%.2f (Height %.2f x %g = %.2f), model bottom y=%.3f, body bottom y=%.3f",
		case.id, case.k, m:GetScale(), hi, height, case.k, height * case.k, box.Position.Y - size.Y / 2, lo))
	check(math.abs(m:GetScale() - case.k) < 1e-3, "sized with ScaleTo")
	check(CollectionService:HasTag(m, "ScaledGiant") and m:GetAttribute("AnimationScale") == case.k, "tagged ScaledGiant, AnimationScale set")
	check(math.abs(hi / (height * case.k) - 1) < 0.03, "body top = Height x k (3%)")
	check(math.abs(box.Position.Y - size.Y / 2) < 0.01, "model's lowest point on y = 0")
	check(lo > -0.05 and lo < 0.05 * case.k + 0.05, "feet on the floor")
	local ref = row.reference
	check(math.abs(ref:GetScale() - 1) < 1e-3 and not CollectionService:HasTag(ref, "ScaledGiant"), "1x control on the values path")
end
-- A 2.5x giant must stay on the values path.
local viking = spawnGiant("Viking", 2.5, -60)
check(math.abs(viking:GetScale() - 1) < 1e-3 and not CollectionService:HasTag(viking, "ScaledGiant"), "Viking x2.5 on the values path")

RunService:Run()
task.wait(1)

-- 2. The client probe, mirrored: copies of a tagged giant at 1x and 4x, frozen idle, Transform ratio.
local function probeCopy(source, k)
	local rig = source:Clone()
	for _, tag in rig:GetTags() do rig:RemoveTag(tag) end
	for _, d in rig:GetDescendants() do
		if d:IsA("Accessory") then d:Destroy() elseif d:IsA("BasePart") then d.Transparency = 1; d.CanCollide = false end
	end
	rig.Parent = folder
	rig:ScaleTo(k)
	rig:PivotTo(source:GetPivot())
	return rig
end
local probeRef, probeScaled = probeCopy(rows[1].fixed, 1), probeCopy(rows[1].fixed, PROBE_SCALE)
settleTracks({ freeze(probeRef), freeze(probeScaled) })
-- roblox-ts Maps compile to plain tables, so the compiled translationRatio takes these as-is.
local ratio = AnimationScale.translationRatio(jointTranslations(probeRef), jointTranslations(probeScaled))
local verdict = AnimationScale.probeVerdict(ratio, PROBE_SCALE)
local apply = AnimationScale.shouldApplyFixup(verdict)
print(string.format("probe: joint translation %s at %gx -> engine %s, fix-up %s",
	ratio and string.format("%.2fx", ratio) or "unmeasured", PROBE_SCALE, verdict, apply and "ON" or "OFF"))
check(verdict ~= "inconclusive", "probe conclusive")
probeRef:Destroy()
probeScaled:Destroy()

-- 3. Animation at size: frozen idle, head displacement relative to the 1x control.
local statics = {}
for _, row in rows do
	for _, key in { "reference", "raw", "fixed" } do statics[row[key]] = headOffset(row[key]) end
end
local fixJoints = {}
if apply then
	for _, row in rows do
		for _, d in row.fixed:GetDescendants() do
			if d:IsA("Motor6D") or d:IsA("AnimationConstraint") then table.insert(fixJoints, { joint = d, k = row.case.k }) end
		end
	end
end
local conn = RunService.Stepped:Connect(function()
	for _, e in fixJoints do e.joint.Transform = AnimationScale.correctedTransform(e.joint.Transform, e.k) end
end)
local tracks = {}
for _, row in rows do
	for _, key in { "reference", "raw", "fixed" } do table.insert(tracks, freeze(row[key])) end
end
settleTracks(tracks)
for _, row in rows do
	local function moved(m) return (headOffset(m) - statics[m]).Magnitude end
	local base = moved(row.reference)
	local k = row.case.k
	local raw, fixed = moved(row.raw) / base, moved(row.fixed) / base
	print(string.format("%s x%g: head moves %.2fx uncorrected, %.2fx with fix-up %s (k=%g, k^2=%g)",
		row.case.id, k, raw, fixed, apply and "on" or "off", k, k * k))
	check(math.abs(fixed / k - 1) < 0.1, string.format("%s animates at its size (head %.2fx, expect %g)", row.case.id, fixed, k))
	local lo = bodyBounds(row.fixed)
	print(string.format("    animated body bottom y=%.3f", lo))
end
conn:Disconnect()
RunService:Stop()
folder:Destroy()
print(fails == 0 and "scale-fixup-probe: PASS" or string.format("scale-fixup-probe: %d FAIL", fails))
