local Peter = include("code.characters.Peter")
local TaintedPeter = include("code.characters.TaintedPeter")
local KeysToTheKingdom = include("code.collectibles.KeysToTheKingdom")
local AlabasterScrap = include("code.trinkets.AlabasterScrap")
local util = include("code.util")

local PLAYERTYPE_PETER = Isaac.GetPlayerTypeByName("Peter", false)
local PLAYERTYPE_TAINTED_PETER = Isaac.GetPlayerTypeByName(
  "Peter",
  true
)

local PlayerVariant = {
  PLAYER = 0,
  COOP_BABY = 1,
}

local TrinketSlot = {
  SLOT_1 = 0,
  SLOT_2 = 1,
}

local COLLECTIBLE_KEYS_TO_THE_KINGDOM = Isaac.GetItemIdByName(
  "Keys to the Kingdom"
)

local TRINKET_ALABASTER_SCRAP = Isaac.GetTrinketIdByName("Alabaster Scrap")

local TidesOfFaith = {}
TidesOfFaith.__index = TidesOfFaith

function TidesOfFaith.new(mod)
  local self = {
    mod = mod,

    evalActiveItems = {},
    alabasterScrapObjects = {},
    keysToTheKingdomObjects = {},
    evalPlayerTypes = {},
    characters = {},
  }

  function self.PostPlayerInit(_, player)
        self:loadCharacter(player)
  end

  function self.PostPlayerUpdate(_, player)
        self:evaluatePlayerType(player)

    self:evaluateActiveItems(player)

    self:evaluateAlabasterScrapCount(player)
  end

  function self.PostGameEnd()
        util.clearTable(self.evalActiveItems)

    for _, keyObjects in pairs(self.keysToTheKingdomObjects) do
      for _, keys in pairs(keyObjects) do
        keys:Unload()
      end
    end
    util.clearTable(self.keysToTheKingdomObjects)

    for _, scraps in pairs(self.alabasterScrapObjects) do
      for _, scrap in ipairs(scraps) do
        scrap:Unload()
      end
    end
    util.clearTable(self.alabasterScrapObjects)

    for _, character in pairs(self.characters) do
      character:Unload()
    end
    util.clearTable(self.characters)

    KeysToTheKingdom.StaticUnload(self.mod)
  end

  setmetatable(self, TidesOfFaith)
  return self
end

function TidesOfFaith:Init()
  self:addCallbacks()
end

function TidesOfFaith:addCallbacks()
  self.mod:AddCallback(
    ModCallbacks.MC_POST_PLAYER_UPDATE,
    self.PostPlayerUpdate,
    PlayerVariant.PLAYER
  )

  self.mod:AddCallback(ModCallbacks.MC_POST_GAME_END, self.PostGameEnd)

  KeysToTheKingdom.StaticLoad(self.mod)
end

function TidesOfFaith:evaluatePlayerType(player)
  local playerIndex = util.getPlayerIndex(player)
  local oldType = self.evalPlayerTypes[playerIndex]
  if oldType == player:GetPlayerType() then return end

  self:loadCharacter(player)
end

function TidesOfFaith:loadCharacter(player)
  local playerIndex = util.getPlayerIndex(player)
  local playerType = player:GetPlayerType()

  self.evalPlayerTypes[playerIndex] = playerType

  local oldCharacter = self.characters[playerIndex]
  if oldCharacter then
    oldCharacter:Unload()
    self.characters[playerIndex] = nil
  end

  local newCharacter
  if playerType == PLAYERTYPE_PETER then
    newCharacter = Peter.new(self.mod, player)
  elseif playerType == PLAYERTYPE_TAINTED_PETER then
    newCharacter = TaintedPeter.new(self.mod, player)
  end

  if newCharacter then
    newCharacter:Load()
    self.characters[playerIndex] = newCharacter
  end
end

function TidesOfFaith:evaluateActiveItems(player)
  local playerIndex = util.getPlayerIndex(player)

  local activeItems = self.evalActiveItems[playerIndex]
  if not activeItems then
    activeItems = {}
    self.evalActiveItems[playerIndex] = activeItems
  end

  local keyObjects = self.keysToTheKingdomObjects[playerIndex]
  if not keyObjects then
    keyObjects = {}
    self.keysToTheKingdomObjects[playerIndex] = keyObjects
  end

  for _, slot in pairs(ActiveSlot) do
    local oldItem = activeItems[slot]
    local newItem = player:GetActiveItem(slot)

    if oldItem ~= newItem then
      activeItems[slot] = newItem

      if oldItem == COLLECTIBLE_KEYS_TO_THE_KINGDOM then
        local keys = keyObjects[slot]
        keys:Unload()
        keyObjects[slot] = nil
      end

      if newItem == COLLECTIBLE_KEYS_TO_THE_KINGDOM then
        local keys = KeysToTheKingdom.new(self.mod, player)
        keys:Load()
        keyObjects[slot] = keys
      end
    end
  end
end

function TidesOfFaith:evaluateAlabasterScrapCount(player)
  local playerScraps = self:getAlabasterScrapCount(player)
  local evalScraps = self:getAlabasterScrapObjects(player)

  local scrapDelta = playerScraps - #evalScraps

  while scrapDelta < 0 do
    scrapDelta = scrapDelta + 1

    local scrap = table.remove(evalScraps)
    scrap:Unload()
  end

  while scrapDelta > 0 do
    scrapDelta = scrapDelta - 1

    local scrap = AlabasterScrap.new(self.mod, player)
    scrap:Load()
    table.insert(evalScraps, scrap)
  end
end

function TidesOfFaith:getAlabasterScrapCount(player)
  local result = 0

  for _, trinketSlot in pairs(TrinketSlot) do
    local trinket = player:GetTrinket(trinketSlot)
    if trinket == TRINKET_ALABASTER_SCRAP then
      result = result + 1
    end
  end

  return result
end

function TidesOfFaith:getAlabasterScrapObjects(player)
  local playerIndex = util.getPlayerIndex(player)
  local result = self.alabasterScrapObjects[playerIndex]
  if not result then
    result = {}
    self.alabasterScrapObjects[playerIndex] = result
  end

  return result
end

return TidesOfFaith