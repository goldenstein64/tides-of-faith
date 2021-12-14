PlayerType.PLAYER_PETER = Isaac.GetPlayerTypeByName("Peter")

local function addCostume(player)
	local costume = Isaac.getCostumeIdByPath("gfx/characters/peter.anm2")
	-- load the costume onto the player
  player:AddNullCostume(costume)
end

local Peter = {}

function Peter.Load(player)
  addCostume(player)
  
  player.GridCollisionClass = GridCollisionClass.COLLISION_PIT
end

return Peter