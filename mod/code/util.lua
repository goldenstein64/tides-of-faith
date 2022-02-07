local util = {}

function util.clearTable(tabl)
	for k in pairs(tabl) do
		tabl[k] = nil
	end
end

function util.clamp(value, min, max)
	return math.min(math.max(value, min), max)
end

function util.getActiveEnemies()
	local activeEnemies = {}
	for _, entity in ipairs(Isaac.GetRoomEntities()) do
		local npc = entity:ToNPC()

		if npc and npc:IsActiveEnemy(false) then
			table.insert(activeEnemies, npc)
		end
	end

	return activeEnemies
end

-- transcribed from:
-- https://github.com/IsaacScript/isaacscript-common/blob/7fb8274a5a3892ab3805ca31af60e3cacce2ba56/src/functions/player.ts#L395
function util.getPlayerIndex(player)
	local character = player:GetPlayerType()
	local collectibleToUse = character == PlayerType.PLAYER_LAZARUS_B and CollectibleType.COLLECTIBLE_INNER_EYE
		or CollectibleType.COLLECTIBLE_SAD_ONION

	local collectibleRNG = player:GetCollectibleRNG(collectibleToUse)

	return collectibleRNG:GetSeed()
end

-- getAliveBosses() boilerplate
-- transcribed from:
-- https://github.com/IsaacScript/isaacscript-common/blob/0b60a0515dad8df64e80c563d4eae5f410241b42/src/functions/npc.ts#L66
local function getEntities(matchingEntityType, matchingVariant, matchingSubType, ignoreFriendly)
	if matchingVariant == nil then
		matchingVariant = -1
	end
	if matchingSubType == nil then
		matchingSubType = -1
	end
	if ignoreFriendly == nil then
		ignoreFriendly = false
	end

	if not matchingEntityType then
		return Isaac.GetRoomEntities()
	end

	return Isaac.FindByType(matchingEntityType, matchingVariant, matchingSubType, ignoreFriendly)
end

local function getNPCs(matchingEntityType, matchingVariant, matchingSubType, ignoreFriendly)
	if ignoreFriendly == nil then
		ignoreFriendly = false
	end

	local entities = getEntities(matchingEntityType, matchingVariant, matchingSubType, ignoreFriendly)

	local npcs = {}
	for _, entity in ipairs(entities) do
		local npc = entity:ToNPC()
		if npc then
			table.insert(npcs, npc)
		end
	end

	return npcs
end

local function getBosses()
	local bosses = {}
	for _, npc in ipairs(getNPCs()) do
		if npc:IsBoss() then
			table.insert(bosses, npc)
		end
	end

	return bosses
end

local NON_ALIVE_NPCS_TYPE_VARIANT = {
	--									VisVariant.CHUBBER_PROJECTILE
	[string.format("%s.%s", EntityType.ENTITY_VIS, 22)] = true,
	--												DeathVariant.DEATH_SCYTHE
	[string.format("%s.%s", EntityType.ENTITY_DEATH, 10)] = true,
	--														PeepVariant.PEEP_EYE
	[string.format("%s.%s", EntityType.ENTITY_PEEP, 10)] = true,
	--													 PeepVariant.BLOAT_EYE
	[string.format("%s.%s", EntityType.ENTITY_PEEP, 11)] = true,
	--											BegottenVariant.BEGOTTEN_CHAIN
	[string.format("%s.%s", EntityType.ENTITY_BEGOTTEN, 10)] = true,
	--													 MamaGurdyVariant.LEFT_HAND
	[string.format("%s.%s", EntityType.ENTITY_MAMA_GURDY, 1)] = true,
	--													MamaGurdyVariant.RIGHT_HAND
	[string.format("%s.%s", EntityType.ENTITY_MAMA_GURDY, 2)] = true,
	--													BigHornVariant.SMALL_HOLE
	[string.format("%s.%s", EntityType.ENTITY_BIG_HORN, 1)] = true,
	--														BigHornVariant.BIG_HOLE
	[string.format("%s.%s", EntityType.ENTITY_BIG_HORN, 2)] = true,
}

local NON_ALIVE_NPCS_TYPE_VARIANT_SUBTYPE = {
	-- 		 													 ChargerVariant.CHARGER  ChargerSubType.MY_SHADOW
	[string.format("%s.%s.%s", EntityType.ENTITY_CHARGER, 0, 1)] = true,
}

local function isRaglingDeathPatch(npc)
	return npc.Type == EntityType.ENTITY_RAGLING
		and npc.Variant == 1 --RaglingVariant.RAG_MANS_RAGLING

		-- They go to STATE_SPECIAL when they are patches on the ground
		and npc.State == NpcState.STATE_SPECIAL
end

local EGGY_STATE_FRAME_OF_FINAL_SPIDER = 45
local function isDyingEggyWithNoSpidersLeft(npc)
	return npc.State == NpcState.STATE_SUICIDE and npc.StateFrame >= EGGY_STATE_FRAME_OF_FINAL_SPIDER
end

local function isAliveExceptionNPC(npc)
	local entityTypeVariant = string.format("%s.%s", npc.Type, npc.Variant)
	if NON_ALIVE_NPCS_TYPE_VARIANT[entityTypeVariant] then
		return true
	end

	local entityTypeVariantSubType = string.format("%s.%s.%s", npc.Type, npc.Variant, npc.SubType)
	if NON_ALIVE_NPCS_TYPE_VARIANT_SUBTYPE[entityTypeVariantSubType] then
		return true
	end

	if isRaglingDeathPatch(npc) then
		return true
	end

	if isDyingEggyWithNoSpidersLeft(npc) then
		return true
	end

	return false
end

function util.getAliveBosses()
	local aliveBosses = {}
	for _, boss in ipairs(getBosses()) do
		if not boss:IsDead() and not isAliveExceptionNPC(boss) then
			table.insert(aliveBosses, boss)
		end
	end

	return aliveBosses
end

return util
