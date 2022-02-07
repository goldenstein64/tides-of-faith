local util = include("code.util")
local PeterCollision = include("code.characters.PeterCollision")

local GAME = Game()

local PLAYERTYPE_PETER = Isaac.GetPlayerTypeByName("Peter", false)

local PlayerVariant = {
  PLAYER = 0,
  COOP_BABY = 1,
}

local COLLECTIBLE_KEYS_TO_THE_KINGDOM = Isaac.GetItemIdByName(
  "Keys to the Kingdom"
)

local TRINKET_ALABASTER_SCRAP = Isaac.GetTrinketIdByName("Alabaster Scrap")

local ID_PETERBUCKLE = Isaac.GetCostumeIdByPath(
  "gfx/characters/Costume_PeterBuckle.anm2"
)

local FLOATING_LIMIT = 30
local PITFALL_TIME = 60

local DAMAGE_ON_FALL = 1
local IFRAMES_AFTER_FALL = 120

local STATS = {
  Speed = 1.0,
  TearDelay = 0,
  Damage = 3.5,
  Range = 6.5,
  ShotSpeed = 1.0,
  Luck = 0.0,
}

local Peter = {
  charactersLoaded = 0,
  addedStaticCallbacks = false,
}
Peter.__index = Peter

function Peter.new(mod, player)
  local self = {
    mod = mod,
    player = player,

    isInPitfall = false,
    stopCounter = 0,
    fallCounter = 0,
  }

  function self.PostPlayerUpdate(_, player)
        if
      util.getPlayerIndex(player) ~= util.getPlayerIndex(self.player)
      or self.player:IsFlying()
    then return end

    if not self.isInPitfall then
      self:whileWalking()
    else
      self:whileInPitfall()
    end
  end

  setmetatable(self, Peter)
  return self
end

function Peter:Load()
  self:addCostume()

  self:addItems()

  self:addCallbacks()

  self:modifyStats()
end

function Peter:Unload()
  self:RemoveCallbacks()
end

function Peter:addCostume()
  if ID_PETERBUCKLE ~= -1 then
    self.player:AddNullCostume(ID_PETERBUCKLE)
  else
    print("PeterBuckle ID was -1!")
  end
end

function Peter:modifyStats()
  -- give Peter the stuff from STATS
end

function Peter:addItems()
  self.player:AddCollectible(COLLECTIBLE_KEYS_TO_THE_KINGDOM)

  -- if Peter has beaten [some boss], give an AlabasterScrap
  local hasBeatenBoss = true
  if hasBeatenBoss then
    self.player:AddTrinket(TRINKET_ALABASTER_SCRAP)
  end
end

function Peter:addCallbacks()
  self.mod:AddCallback(
    ModCallbacks.MC_POST_PLAYER_UPDATE,
    self.PostPlayerUpdate,
    PlayerVariant.PLAYER
  )

  Peter.charactersLoaded = Peter.charactersLoaded + 1

  self:evaluateStaticCallbacks()
end

function Peter:RemoveCallbacks()
  self.mod:RemoveCallback(
    ModCallbacks.MC_POST_PLAYER_UPDATE,
    self.PostPlayerUpdate
  )

  Peter.charactersLoaded = Peter.charactersLoaded - 1

  self:evaluateStaticCallbacks()
end

function Peter:evaluateStaticCallbacks()
  local charactersPresent = Peter.charactersLoaded > 0
  if charactersPresent and not Peter.addedStaticCallbacks then
    self:addStaticCallbacks()
  elseif not charactersPresent and Peter.addedStaticCallbacks then
    self:removeStaticCallbacks()
  end
end

function Peter:addStaticCallbacks()
  if Peter.addedStaticCallbacks then return end
  Peter.addedStaticCallbacks = true

  PeterCollision.Load(self.mod)
end

function Peter:removeStaticCallbacks()
  if not Peter.addedStaticCallbacks then return end
  Peter.addedStaticCallbacks = false

  PeterCollision.Unload(self.mod)
end

function Peter:whileWalking()
  local movementInput = self.player:GetMovementInput()
  local gridEntity = GAME:GetRoom():GetGridEntityFromPos(self.player.Position)
  if not gridEntity then return end

  local gridPit = gridEntity:ToPit()

  local isWalkingOverPit = gridPit and not gridPit.HasLadder
  if movementInput:LengthSquared() == 0 and isWalkingOverPit then
    self.stopCounter = self.stopCounter + 1
    if self.stopCounter > FLOATING_LIMIT then
      self.player:TakeDamage(
        DAMAGE_ON_FALL,
        DamageFlag.DAMAGE_COUNTDOWN | DamageFlag.DAMAGE_PITFALL,
        EntityRef(nil),
        IFRAMES_AFTER_FALL
      )
      self.player:AnimatePitfallIn()
      self.isInPitfall = true
      self.stopCounter = 0
    end
  else
    self.stopCounter = 0
  end
end

function Peter:whileInPitfall()
  self.fallCounter = self.fallCounter + 1
  if self.fallCounter > PITFALL_TIME then
    local nearestFreePosition = Isaac.GetFreeNearPosition(self.player.Position, math.huge)
    self.player.Position = nearestFreePosition
    self.player:AnimatePitfallOut()
    self.isInPitfall = false
    self.fallCounter = 0
  end
end

return Peter