local util = require("code.util")
local COLLECTIBLE_ALABASTER_SCRAP = Isaac.GetItemIdByName("Alabaster Scrap")

local PlayerVariant = {
  PLAYER = 0,
  COOP_BABY = 1,
}

local ANGELIC_ITEMS = {
  [CollectibleType.COLLECTIBLE_SPIRIT_SWORD] = true,
  [CollectibleType.COLLECTIBLE_SPEAR_OF_DESTINY] = true,
}

local ANGELIC_TRINKETS = {}

local BUFF_PER_ITEM = 0.2

local AlabasterScrap = {}
AlabasterScrap.__index = AlabasterScrap

function AlabasterScrap.new(mod, owner)
  local self = {
    mod = mod,
    owner = owner,

    evalCollectibleMap = {},
  }

  function self.PostPlayerUpdate(_, player)
    if util.getPlayerIndex(player) ~= util.getPlayerIndex(self.owner) then return end

    if self:shouldRecalculateDamageBuff() then
      self.owner:AddCacheFlags(CacheFlag.CACHE_DAMAGE)
      self.owner:EvaluateItems()
    end
  end

  function self.EvaluateCache(_, player, cacheFlag)
    if
      (cacheFlag & CacheFlag.CACHE_DAMAGE) == 0
      or util.getPlayerIndex(player) ~= util.getPlayerIndex(self.owner)
    then return end

    local newDamageBuff = self:calculateDamageBuff()

    self.owner.Damage = self.owner.Damage + newDamageBuff
  end

  setmetatable(self, AlabasterScrap)
  return self
end

function AlabasterScrap:Load()
  self:addCallbacks()
end

function AlabasterScrap:addCallbacks()
  self.mod:AddCallback(ModCallbacks.MC_EVALUATE_CACHE, self.EvaluateCache)

  self.mod:AddCallback(
    ModCallbacks.MC_POST_PLAYER_UPDATE,
    self.PostPlayerUpdate,
    PlayerVariant.PLAYER
  )

  self.owner:AddCacheFlags(CacheFlag.CACHE_DAMAGE)
  self.owner:EvaluateItems()
end

function AlabasterScrap:Unload()
  self:removeCallbacks()

  self.owner:AddCacheFlags(CacheFlag.CACHE_DAMAGE)
  self.owner:EvaluateItems()
end

function AlabasterScrap:removeCallbacks()
  self.mod:RemoveCallback(ModCallbacks.MC_EVALUATE_CACHE, self.EvaluateCache)

  self.mod:RemoveCallback(
    ModCallbacks.MC_POST_PLAYER_UPDATE,
    self.PostPlayerUpdate
  )
end

function AlabasterScrap:shouldRecalculateDamageBuff()
  for item in pairs(ANGELIC_ITEMS) do
    local actual = self.owner:GetCollectibleNum(item)
    local expected = self.evalCollectibleMap[item]
    if actual ~= expected then
      return true
    end
  end

  return false
end

function AlabasterScrap:calculateDamageBuff()
  local totalItemCount = 0
  for item in pairs(ANGELIC_ITEMS) do
    local itemCount = self.owner:GetCollectibleNum(item)
    self.evalCollectibleMap[item] = itemCount
    totalItemCount = totalItemCount + itemCount
  end

  return totalItemCount * BUFF_PER_ITEM
end

return AlabasterScrap