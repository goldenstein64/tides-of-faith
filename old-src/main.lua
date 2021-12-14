local Mod = RegisterMod("Peter", 1)

local Peter = require("Peter")
local TaintedPeter = require("TaintedPeter")

function Mod:PlayerInit(player)
	if player:GetPlayerType() == PlayerType.PLAYER_PETER then
		Peter.Load(player)
	elseif player:GetPlayerType() == PlayerType.PLAYER_TAINTED_PETER then
		TaintedPeter.Load(player)
	end
end
Mod:AddCallback(ModCallbacks.MC_POST_PLAYER_INIT, Mod.PlayerInit, 2)

local function revealPitfall()
  local value = ActionTriggers.ACTIONTRIGGER_NONE
end

local function removePitfall() end

local function canMove()
	return true
end

local isMoving = true
local moveStartTime = 0
function Mod:OnUpdate(player)
	local movementInput = player:GetMovmentInput()

	local room = Game().GetRoom()
	if room == nil then
		return
	end

	local newFrameCount = room.GetFrameCount()
	if movementInput.LengthSquared() == 0 then
		if isMoving then
			isMoving = false
			moveStartTime = newFrameCount
			revealPitfall()
		elseif newFrameCount - moveStartTime > 15 then
			-- play a falling animation
			player:TakeDamage(0.5)
			moveStartTime = newFrameCount
			removePitfall()
			revealPitfall() -- reveal a new pitfall
		end
	else
		isMoving = true
		removePitfall()
	end
end
Mod:AddCallback(ModCallbacks.MC_POST_PLAYER_UPDATE, Mod.OnUpdate, 2)
