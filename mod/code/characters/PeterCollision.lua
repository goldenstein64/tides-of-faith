local CollisionObjects = include("code.CollisionObjects")
local util = include("code.util")

local GAME = Game()

local PLAYERTYPE_PETER = Isaac.GetPlayerTypeByName("Peter", false)

local TILE_RADIUS = Vector(40, 40) / 2

local PeterCollision = {
  pitCollisionObjects = {},
}

function PeterCollision.Load(mod)
  PeterCollision.addCallbacks(mod)
end

function PeterCollision.Unload(mod)
  PeterCollision.removeCallbacks(mod)

  local room = GAME:GetRoom()
  local gridSize = room:GetGridSize()
  for i = 1, gridSize do
    PeterCollision.removePitCollisionObject(room, i)
  end

  util.clearTable(PeterCollision.pitCollisionObjects)
  CollisionObjects:reset()
end

function PeterCollision.addCallbacks(mod)
  CollisionObjects:init(mod)
  mod:AddCallback(ModCallbacks.MC_POST_NEW_ROOM, PeterCollision.PostNewRoom)
  mod:AddCallback(ModCallbacks.MC_POST_UPDATE, PeterCollision.PostUpdate)
  mod:AddCallback(
    ModCallbacks.MC_FAMILIAR_UPDATE,
    PeterCollision.FamiliarUpdate
  )
end

function PeterCollision.removeCallbacks(mod)
  CollisionObjects:cleanUp(mod)
  mod:RemoveCallback(
    ModCallbacks.MC_POST_NEW_ROOM,
    PeterCollision.PostNewRoom
  )
  mod:RemoveCallback(ModCallbacks.MC_POST_UPDATE, PeterCollision.PostUpdate)
  mod:RemoveCallback(
    ModCallbacks.MC_FAMILIAR_UPDATE,
    PeterCollision.FamiliarUpdate
  )
end

function PeterCollision.PostNewRoom()
    util.clearTable(PeterCollision.pitCollisionObjects)
  
  local room = GAME:GetRoom()
  local gridSize = room:GetGridSize()
  for i = 1, gridSize do
    local gridEntity = room:GetGridEntity(i)
    if gridEntity and gridEntity:GetType() == GridEntityType.GRID_PIT then
      PeterCollision.createPitCollisionObject(room, i)
    end
  end
end

function PeterCollision.PostUpdate()
    local room = GAME:GetRoom()
  local gridSize = room:GetGridSize()
  for i = 1, gridSize do
    local gridEntity = room:GetGridEntity(i)

    local isPit = gridEntity and gridEntity:GetType() == GridEntityType.GRID_PIT
    local collObjExists = PeterCollision.pitCollisionObjects[i]
    if isPit and not collObjExists then
      PeterCollision.createPitCollisionObject(room, i)
    elseif not isPit and collObjExists then
      PeterCollision.removePitCollisionObject(room, i)
    end
  end
end

function PeterCollision.FamiliarUpdate(_, familiar)
    CollisionObjects:entityGridCollisionUpdate(familiar)
end

function PeterCollision.createPitCollisionObject(room, gridIndex)
  local gridEntity = room:GetGridEntity(gridIndex)
  local position = room:GetGridPosition(gridIndex)

  local collObj = CollisionObjects:setCollisionRect(
    position - TILE_RADIUS,
    position + TILE_RADIUS,
    GridCollisionClass.COLLISION_PIT,
    PeterCollision.isNotPlayerOrNotPeter
  )

  if gridEntity then
    gridEntity.CollisionClass = GridCollisionClass.COLLISION_NONE
  end

  PeterCollision.pitCollisionObjects[gridIndex] = collObj
end

function PeterCollision.removePitCollisionObject(room, gridIndex)
  local collObj = PeterCollision.pitCollisionObjects[gridIndex]
  local gridEntity = room:GetGridEntity(gridIndex)

  if collObj then
    collObj.Remove()
    PeterCollision.pitCollisionObjects[gridIndex] = nil
  end

  if gridEntity then
    gridEntity.CollisionClass = GridCollisionClass.COLLISION_PIT
  end
end

function PeterCollision.isNotPlayerOrNotPeter(collObj, ent)
  local player = ent:ToPlayer()
  return not player or player:GetPlayerType() ~= PLAYERTYPE_PETER
end

return PeterCollision