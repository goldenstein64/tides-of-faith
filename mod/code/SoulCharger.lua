local util = include("code.util")

local SOUL_SPEED = 8

local SoulCharger = {}
SoulCharger.__index = SoulCharger

function SoulCharger.new(mod, owner, maxCharge)
  local self = {
    mod = mod,
    owner = owner,
    maxCharge = maxCharge,
    activeSlot = ActiveSlot.SLOT_PRIMARY,

    soulEffects = {},
  }

  function self.PostNpcDeath(_, enemy)
    if not enemy:IsActiveEnemy(true) then return end

    local effect = Isaac.Spawn(
      EntityType.ENTITY_EFFECT,
      EffectVariant.ENEMY_SOUL,
      0,
      enemy.Position,
      Vector.Zero,
      this.owner
    ):ToEffect()

    self.soulEffects[effect.Index] = true
  end

  function self.PostEffectUpdate(_, effect)
    if not self.soulEffects[effect.Index] then return end

    if not effect:Exists() then
      self.soulEffects[effect.Index] = nil
      return
    end

    local direction = (self.owner.Position - effect.Position):Normalized()

    effect.Velocity = direction * SOUL_SPEED
    if effect.Position:DistanceSquared(self.owner.Position) < 400 then
      effect:Remove()
      Isaac.Spawn(
        EntityType.ENTITY_EFFECT,
        EffectVariant.COIN_PARTICLE,
        0,
        this.owner.Position,
        Vector.Zero,
        effect
      )
      self:addCharge(1)
    end
  end

  setmetatable(self, SoulCharger)
  return self
end

function SoulCharger:Load()
  self:addCallbacks()
end

function SoulCharger:Unload()
  self:removeCallbacks()
end

function SoulCharger:addCallbacks()
  self.mod:AddCallback(ModCallbacks.MC_POST_NPC_DEATH, self.PostNpcDeath)

  self.mod:AddCallback(
      ModCallbacks.MC_POST_EFFECT_UPDATE,
      self.PostEffectUpdate,
      EffectVariant.ENEMY_SOUL
    )
end

function SoulCharger:removeCallbacks()
  self.mod:RemoveCallback(ModCallbacks.MC_POST_NPC_DEATH, self.PostNpcDeath)

  self.mod:RemoveCallback(
    ModCallbacks.MC_POST_EFFECT_UPDATE,
    self.PostEffectUpdate
  )
end

function SoulCharger:getCharge()
  return self.owner:GetActiveCharge(self.activeSlot)
end

function SoulCharger:addCharge(charge)
  local newCharge = util.clamp(self:getCharge() + charge, 0, self.maxCharge)
  self.owner:SetActiveCharge(newCharge, self.activeSlot)
end

return SoulCharger