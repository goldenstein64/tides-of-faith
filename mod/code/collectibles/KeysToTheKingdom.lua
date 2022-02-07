local util = include("code.util")

local PLAYERTYPE_PETER = Isaac.GetPlayerTypeByName("Peter", false)

local COLLECTIBLE_KEYS_TO_THE_KINGDOM = Isaac.GetItemIdByName("Keys to the Kingdom")

local GAME = Game()

local KEY_PIECE_1 = CollectibleType.COLLECTIBLE_KEY_PIECE_1
local KEY_PIECE_2 = CollectibleType.COLLECTIBLE_KEY_PIECE_2

local PlayerVariant = {
  PLAYER = 0,
  COOP_BABY = 1,
}

local MAX_CHARGE = 8

local DAMAGE_PER_CHARGE = 60

local SPARE_DURATION = 10

local UNSPARABLE_BOSSES = {
  [EntityType.ENTITY_MOM] = true,
  [EntityType.ENTITY_MOTHER] = true,
  [EntityType.ENTITY_MOTHERS_SHADOW] = true,
  [EntityType.ENTITY_SATAN] = true,
  [EntityType.ENTITY_BEAST] = true,
  [EntityType.ENTITY_DELIRIUM] = true,
  [EntityType.ENTITY_HUSH] = true,
  [EntityType.ENTITY_MEGA_SATAN] = true,
  [EntityType.ENTITY_MEGA_SATAN_2] = true,
  [EntityType.ENTITY_THE_LAMB] = true,
  [EntityType.ENTITY_MOMS_HEART] = true,
  [EntityType.ENTITY_ISAAC] = true,
  [EntityType.ENTITY_DOGMA] = true,
  [EntityType.ENTITY_ULTRA_GREED] = true,
}

local KeysToTheKingdom = {
  smitedEnemies = {},
  bossTimers = {},
  rng = RNG(),
}
KeysToTheKingdom.__index = KeysToTheKingdom

function KeysToTheKingdom.new(mod, owner)
  local self = {
    mod = mod,
    owner = owner,

    damageCounter = 0,
  }

  function self.EntityTakeDamage(
    _, 
    entity,
    damageTaken,
    damageFlags,
    damageSource,
    damageCountdownFrames
  )
        if KeysToTheKingdom.smitedEnemies[entity.Index] then
      KeysToTheKingdom.smitedEnemies[entity.Index] = nil
      return
    end

    if KeysToTheKingdom.bossTimers[entity.Index] then
      KeysToTheKingdom.bossTimers[entity.Index] = nil
    end

    if not entity:IsActiveEnemy(true) then return end

    self.damageCounter = self.damageCounter + damageTaken
    if self.damageCounter < DAMAGE_PER_CHARGE then return end

    local charges = math.floor(self.damageCounter / DAMAGE_PER_CHARGE)
    self.damageCounter = self.damageCounter % DAMAGE_PER_CHARGE

    self:addCharge(charges)
  end

  function self.PostPlayerUpdate(_, player)
    if util.getPlayerIndex(player) ~= util.getPlayerIndex(self.owner) then return end

    local queuedItem = self.owner.QueuedItem.Item
    if
      self.owner:GetActiveItem(ActiveSlot.SLOT_PRIMARY) ~= COLLECTIBLE_KEYS_TO_THE_KINGDOM
      and queuedItem and queuedItem.Type ~= COLLECTIBLE_KEYS_TO_THE_KINGDOM
    then
      self:Unload()
    end
  end

  function self.Unload()
    self:removeCallbacks()
  end

  setmetatable(self, KeysToTheKingdom)
  return self
end

function KeysToTheKingdom.StaticLoad(mod)
  KeysToTheKingdom.addStaticCallbacks(mod)
end

function KeysToTheKingdom.StaticUnload(mod)
  KeysToTheKingdom.removeStaticCallbacks(mod)
end

function KeysToTheKingdom:Load()
  self:addCallbacks()
end

function KeysToTheKingdom:addCallbacks()
  self.mod:AddCallback(
    ModCallbacks.MC_POST_PLAYER_UPDATE,
    self.PostPlayerUpdate,
    PlayerVariant.PLAYER
  )

  self.mod:AddCallback(ModCallbacks.MC_ENTITY_TAKE_DMG, self.EntityTakeDamage)
  self.mod:AddCallback(ModCallbacks.MC_POST_GAME_END, self.Unload)
end

function KeysToTheKingdom:removeCallbacks()
  self.mod:RemoveCallback(
    ModCallbacks.MC_POST_PLAYER_UPDATE,
    self.PostPlayerUpdate
  )

  self.mod:RemoveCallback(ModCallbacks.MC_ENTITY_TAKE_DMG, self.EntityTakeDamage)
  self.mod:RemoveCallback(ModCallbacks.MC_POST_GAME_END, self.Unload)
end

function KeysToTheKingdom.addStaticCallbacks(mod)
  mod:AddCallback(
    ModCallbacks.MC_USE_ITEM,
    KeysToTheKingdom.UseItem,
    COLLECTIBLE_KEYS_TO_THE_KINGDOM
  )
end

function KeysToTheKingdom.removeStaticCallbacks(mod)
  mod:RemoveCallback(ModCallbacks.MC_USE_ITEM, KeysToTheKingdom.UseItem)

  mod:RemoveCallback(
    ModCallbacks.MC_POST_UPDATE,
    KeysToTheKingdom.BossRoomPostUpdate
  )
end

function KeysToTheKingdom.UseItem(
  mod, 
  collectibleType,
  rng,
  player,
  useFlags,
  activeSlot,
  customVarData
)
  local room = GAME:GetRoom()

  player:AnimateCollectible(
    COLLECTIBLE_KEYS_TO_THE_KINGDOM,
    "UseItem",
    "PlayerPickup"
  )
  local roomType = room:GetType()

  if room:GetAliveBossesCount() > 0 then
    local sparableBosses = {}
    for _, boss in pairs(util.getAliveBosses()) do
      if 
        not UNSPARABLE_BOSSES[boss.Type]
        and not KeysToTheKingdom.bossTimers[boss.Index]
      then
        table.insert(sparableBosses, boss)
      end
    end

    local ownerEffects = player:GetEffects()
    if #sparableBosses > 0 then
      local choice = KeysToTheKingdom.rng:RandomInt(#sparableBosses) + 1
      local chosenBoss = sparableBosses[choice]
      KeysToTheKingdom.spareBoss(mod, player, chosenBoss)
    else
      ownerEffects:AddCollectibleEffect(
        CollectibleType.COLLECTIBLE_HOLY_MANTLE
      )
    end
  elseif room:GetAliveEnemiesCount() > 0 then
    KeysToTheKingdom.dealHolyDamageToAllEnemies(player)
  elseif roomType == RoomType.ROOM_ANGEL then
    KeysToTheKingdom.giveKeyPieceOrHolyItem(player)
  elseif roomType == RoomType.ROOM_DEVIL then
    KeysToTheKingdom.pickOneFreeDevilDeal()
  else
    room:SpawnClearAward()
  end
end

function KeysToTheKingdom.giveKeyPieceOrHolyItem(player)
  if not player:HasCollectible(KEY_PIECE_1) then
    player:AddCollectible(KEY_PIECE_1)
  elseif not player:HasCollectible(KEY_PIECE_2) then
    player:AddCollectible(KEY_PIECE_2)
  else
    -- give the player a holy item
    local itemPool = GAME:GetItemPool()
    local config = Isaac.GetItemConfig()
    local chosenCollectible
    local chosenConfig
    repeat
      chosenCollectible = itemPool:GetCollectible(ItemPoolType.POOL_ANGEL)
      chosenConfig = config:GetCollectible(chosenCollectible)
    until not chosenConfig or chosenConfig.Type ~= ItemType.ITEM_ACTIVE

    -- do nothing if there are no items in the angel pool I guess
    if chosenCollectible ~= CollectibleType.COLLECTIBLE_NULL then
      itemPool:RemoveCollectible(chosenCollectible)
      player:AddCollectible(chosenCollectible)
    end
  end
end

function KeysToTheKingdom.pickOneFreeDevilDeal()
  local dealList = {}
  for _, entity in ipairs(Isaac.GetRoomEntities()) do
    local pickup = entity:ToPickup()
    if pickup 
      and pickup.Variant == PickupVariant.PICKUP_COLLECTIBLE
      and pickup.Price ~= PickupPrice.PRICE_FREE 
    then
      table.insert(dealList, pickup)
    end
  end

  for _, deal in ipairs(dealList) do
    -- this removes the heart price
    deal:Morph(deal.Type, deal.Variant, deal.SubType, false, true, false)

    -- make it so the rest of the deals disappear when one is chosen
    deal.OptionsPickupIndex = 1
  end
end

function KeysToTheKingdom.spareBoss(mod, player, boss)
  if boss.Type == EntityType.ENTITY_BABY_PLUM then
    local plumBossNpc = boss:ToNPC()
    plumBossNpc.State = NpcState.STATE_SPECIAL

    return
  end

  local effect = Isaac.Spawn(
    EntityType.ENTITY_EFFECT,
    EffectVariant.HALLOWED_GROUND,
    0,
    boss.Position,
    Vector.Zero,
    player
  ):ToEffect()

  effect.LifeSpan = 1
  effect:FollowParent(boss)

  KeysToTheKingdom.bossTimers[boss] = SPARE_DURATION * 30

  -- if no boss timers exist,
  if not KeysToTheKingdom.bossTimersPresent then
    KeysToTheKingdom.bossTimersPresent = true
    mod:AddCallback(
      ModCallbacks.MC_POST_UPDATE,
      KeysToTheKingdom.BossRoomPostUpdate
    )
  end
end

function KeysToTheKingdom.BossRoomPostUpdate(mod)
  for boss, duration in pairs(KeysToTheKingdom.bossTimers) do
    duration = duration - 1
    KeysToTheKingdom.bossTimers[boss] = duration
    if duration <= 0 then
      Isaac.Spawn(
        EntityType.ENTITY_EFFECT,
        EffectVariant.POOF01,
        0,
        boss.Position,
        Vector.Zero,
        boss
      )
      boss:Remove()

      KeysToTheKingdom.bossTimers[boss] = nil
    end
  end

  -- checking if there are any boss timers present
  if next(KeysToTheKingdom.bossTimers) then return end

  mod:RemoveCallback(
    ModCallbacks.MC_POST_UPDATE,
    KeysToTheKingdom.BossRoomPostUpdate
  )
  KeysToTheKingdom.bossTimersPresent = false
end

function KeysToTheKingdom.dealHolyDamageToAllEnemies(player)
  local activeEnemies = util.getActiveEnemies()
  local smitedAnEnemy = #activeEnemies > 0
  for _, enemy in ipairs(activeEnemies) do
    enemy:TakeDamage(100, 0, EntityRef(player), 0)
    if enemy:HasMortalDamage() then
      KeysToTheKingdom.smitedEnemies[enemy.Index] = true
    end

    Isaac.Spawn(
      EntityType.ENTITY_EFFECT,
      EffectVariant.CRACK_THE_SKY,
      DamageFlag.DAMAGE_NO_PENALTIES,
      enemy.Position,
      Vector.Zero,
      nil
    )

    enemy:PlaySound(SoundEffect.SOUND_ANGEL_BEAM, 1, 0, false, 0)
  end

  if not smitedAnEnemy then
    local room = GAME:GetRoom()
    room:SpawnClearAward()
  end
end

function KeysToTheKingdom:getCharge()
  return self.owner:GetActiveCharge(ActiveSlot.SLOT_PRIMARY)
end

function KeysToTheKingdom:addCharge(charge)
  local newCharge = util.clamp(self:getCharge() + charge, 0, MAX_CHARGE)
  self.owner:SetActiveCharge(newCharge, ActiveSlot.SLOT_PRIMARY)
end

return KeysToTheKingdom