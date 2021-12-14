PlayerType.PLAYER_TAINTED_PETER = Isaac.GetPlayerTypeByName("Peter", true)

local function addCostume(player)
	local costume = Isaac.getCostumeIdByPath("gfx/characters/tainted_peter.anm2")
  
	-- load the costume onto the player
	player:AddNullCostume(costume)
end

local TaintedPeter = {}

function TaintedPeter.Load(player)
  addCostume(player)
    
  player.GridCollisionClass = GridCollisionClass.COLLISION_WALL
end

return TaintedPeter