local TaintedPeter = {}
TaintedPeter.__index = TaintedPeter

function TaintedPeter.new(mod, player)
  local self = {
    mod = mod,
    player = player,
  }

  setmetatable(self, TaintedPeter)
  return self
end

function TaintedPeter:Load()
  -- change the player's collision so it doesn't touch anything
  self.player.GridCollisionClass = EntityGridCollisionClass.GRIDCOLL_WALLS
end

function TaintedPeter:Unload()
  -- nothing here, used by main.lua
end

return TaintedPeter