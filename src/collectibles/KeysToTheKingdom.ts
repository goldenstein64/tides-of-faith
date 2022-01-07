import { getAliveBosses, getPlayerIndex } from "isaacscript-common";
import Loadable from "../Loadable";
import Mod from "../Mod";
import { clamp, getActiveEnemies } from "../util";

const PLAYERTYPE_PETER = Isaac.GetPlayerTypeByName("Peter", false);

const COLLECTIBLE_KEYS_TO_THE_KINGDOM = Isaac.GetItemIdByName(
  "Keys to the Kingdom",
);

const GAME = Game();

const KEY_PIECE_1: CollectibleType = CollectibleType.COLLECTIBLE_KEY_PIECE_1;
const KEY_PIECE_2: CollectibleType = CollectibleType.COLLECTIBLE_KEY_PIECE_2;

/** Describes how many charges the "Keys to the Kingdom" has */
const MAX_CHARGE: int = 8;

/** Describes how much damage to deal in order to grant a charge */
const DAMAGE_PER_CHARGE = 60;

/**
 * Describes how long Isaac has to survive before sparing a boss, in seconds
 */
const SPARE_DURATION = 10;

const UNSPARABLE_BOSSES = new Set<EntityType>([
  EntityType.ENTITY_MOM,
  EntityType.ENTITY_MOTHER,
  EntityType.ENTITY_MOTHERS_SHADOW,
  EntityType.ENTITY_SATAN,
  EntityType.ENTITY_BEAST,
  EntityType.ENTITY_DELIRIUM,
  EntityType.ENTITY_HUSH,
  EntityType.ENTITY_MEGA_SATAN,
  EntityType.ENTITY_MEGA_SATAN_2,
  EntityType.ENTITY_THE_LAMB,
  EntityType.ENTITY_MOMS_HEART,
  EntityType.ENTITY_ISAAC,
  EntityType.ENTITY_DOGMA,
  EntityType.ENTITY_ULTRA_GREED,
]);

/**
 * An object that represents the behavior of the item "Keys to the Kingdom."
 *
 * This item
 *
 * Every time Isaac deals "DAMAGE_PER_CHARGE," it gives Keys a charge as well.
 *
 * When used, its effect is based on the room Isaac is currently in:
 *
 * - In an angel room, Isaac gets a key piece. If there are no key pieces to
 *   give, Isaac gets a random holy item instead.
 *
 * - In a devil room, Isaac can pick exactly one devil deal for free.
 *
 * - In a boss room with living bosses present, Isaac has to survive for a
 *   number of seconds before "sparing the boss," which lets Isaac clear the
 *   room.
 *
 * - In any other room with living enemies present, Keys will deal
 *   damage to all enemies in the room.
 *
 * - Otherwise, Keys will spawn a room clear reward from that room's pool.
 */
export default class KeysToTheKingdom implements Loadable {
  private static smitedEnemies = new Set<int>();
  private static bossTimers = new Map<int, int>();
  private damageCounter = 0;

  private static rng = RNG();

  private static bossTimersPresent = false;

  constructor(private owner: EntityPlayer) {}

  static StaticLoad(): void {
    // if Peter has beat Delirium in this save file, add it to the angel pool
    // we would also have to update this after a run ends...

    KeysToTheKingdom.AddStaticCallbacks();
  }

  static StaticUnload(): void {
    KeysToTheKingdom.RemoveStaticCallbacks();
  }

  Load(): void {
    this.AddCallbacks();
  }

  Unload(): void {
    this.RemoveCallbacks();
  }

  private AddCallbacks() {
    Mod.AddCallback(
      ModCallbacks.MC_POST_PLAYER_UPDATE,
      this.PostPlayerUpdate,
      PlayerVariant.PLAYER,
    );

    Mod.AddCallback(ModCallbacks.MC_ENTITY_TAKE_DMG, this.EntityTakeDamage);
  }

  private RemoveCallbacks(): void {
    Mod.RemoveCallback(
      ModCallbacks.MC_POST_PLAYER_UPDATE,
      this.PostPlayerUpdate,
    );

    Mod.RemoveCallback(ModCallbacks.MC_POST_GAME_END, this.Unload);
  }

  private static AddStaticCallbacks() {
    Mod.AddCallback(
      ModCallbacks.MC_USE_ITEM,
      KeysToTheKingdom.UseItem,
      COLLECTIBLE_KEYS_TO_THE_KINGDOM,
    );
  }

  private static RemoveStaticCallbacks() {
    Mod.RemoveCallback(ModCallbacks.MC_USE_ITEM, KeysToTheKingdom.UseItem);

    Mod.RemoveCallback(
      ModCallbacks.MC_POST_UPDATE,
      KeysToTheKingdom.BossRoomPostUpdate,
    );
  }

  private EntityTakeDamage = (
    entity: Entity,
    damageTaken: number,
    damageFlags: DamageFlag,
    damageSource: EntityRef,
    damageCountdownFrames: number,
  ): void => {
    if (KeysToTheKingdom.smitedEnemies.has(entity.Index)) {
      KeysToTheKingdom.smitedEnemies.delete(entity.Index);
      return;
    }

    if (KeysToTheKingdom.bossTimers.has(entity.Index)) {
      KeysToTheKingdom.bossTimers.delete(entity.Index);
    }

    if (!entity.IsActiveEnemy(true)) return;

    this.damageCounter += damageTaken;
    if (this.damageCounter < DAMAGE_PER_CHARGE) return;

    let charges = Math.floor(this.damageCounter / DAMAGE_PER_CHARGE);
    this.damageCounter %= DAMAGE_PER_CHARGE;

    KeysToTheKingdom.addCharge(this.owner, charges);
  };

  private PostPlayerUpdate = (player: EntityPlayer): void => {
    if (getPlayerIndex(player) !== getPlayerIndex(this.owner)) return;

    if (
      this.owner.GetActiveItem(ActiveSlot.SLOT_PRIMARY) !==
        COLLECTIBLE_KEYS_TO_THE_KINGDOM &&
      this.owner.QueuedItem.Item?.Type !== COLLECTIBLE_KEYS_TO_THE_KINGDOM
    ) {
      this.Unload();
    }
  };

  private static UseItem = (
    collectibleType: CollectibleType,
    rng: RNG,
    player: EntityPlayer,
    useFlags: UseFlag,
    activeSlot: number,
    customVarData: number,
  ): void => {
    let room = GAME.GetRoom();

    player.AnimateCollectible(
      COLLECTIBLE_KEYS_TO_THE_KINGDOM,
      PlayerItemAnimation.USE_ITEM,
      CollectibleAnimation.PLAYER_PICKUP,
    );

    let roomType = room.GetType();

    if (room.GetAliveBossesCount() > 0) {
      let sparableBosses = [];
      for (let boss of getAliveBosses()) {
        if (
          !UNSPARABLE_BOSSES.has(boss.Type) &&
          !KeysToTheKingdom.bossTimers.has(boss.Index)
        ) {
          sparableBosses.push(boss);
        }
      }

      let ownerEffects = player.GetEffects();
      if (sparableBosses.length > 0) {
        let choice = KeysToTheKingdom.rng.RandomInt(sparableBosses.length);
        let chosenBoss = sparableBosses[choice];
        KeysToTheKingdom.spareBoss(player, chosenBoss);
      } else {
        ownerEffects.AddCollectibleEffect(
          CollectibleType.COLLECTIBLE_HOLY_MANTLE,
        );
      }
    } else if (room.GetAliveEnemiesCount() > 0) {
      KeysToTheKingdom.dealHolyDamageToAllEnemies(player);
    } else if (roomType === RoomType.ROOM_ANGEL) {
      KeysToTheKingdom.giveKeyPieceOrHolyItem(player);
    } else if (roomType === RoomType.ROOM_DEVIL) {
      KeysToTheKingdom.pickOneFreeDevilDeal();
    } else {
      room.SpawnClearAward();
    }
  };

  private static giveKeyPieceOrHolyItem(player: EntityPlayer): void {
    if (!player.HasCollectible(KEY_PIECE_1)) {
      player.AddCollectible(KEY_PIECE_1);
    } else if (!player.HasCollectible(KEY_PIECE_2)) {
      player.AddCollectible(KEY_PIECE_2);
    } else {
      // give the player a holy item
      let itemPool = GAME.GetItemPool();
      let config = Isaac.GetItemConfig();
      let chosenCollectible: CollectibleType;
      let chosenConfig: ItemConfigItem | undefined;
      do {
        chosenCollectible = itemPool.GetCollectible(ItemPoolType.POOL_ANGEL);
        chosenConfig = config.GetCollectible(chosenCollectible);
      } while (chosenConfig?.Type === ItemType.ITEM_ACTIVE);

      // do nothing if there are no items in the angel pool I guess
      if (chosenCollectible !== CollectibleType.COLLECTIBLE_NULL) {
        itemPool.RemoveCollectible(chosenCollectible);
        player.AddCollectible(chosenCollectible);
      }
    }
  }

  private static pickOneFreeDevilDeal(): void {
    let dealList: EntityPickup[] = [];
    for (let entity of Isaac.GetRoomEntities()) {
      let pickup = entity.ToPickup();
      if (!pickup) continue;

      let isDevilDeal =
        pickup.Variant === PickupVariant.PICKUP_COLLECTIBLE &&
        pickup.Price !== PickupPrice.PRICE_FREE;
      if (!isDevilDeal) continue;

      pickup = pickup!;

      dealList.push(pickup);
    }

    for (let deal of dealList) {
      deal.Morph(deal.Type, deal.Variant, deal.SubType, false, true, false);
      deal.OptionsPickupIndex = 1;
    }
  }

  private static spareBoss(player: EntityPlayer, boss: EntityNPC): void {
    if (boss.Type === EntityType.ENTITY_BABY_PLUM) {
      let plumBossNpc = boss.ToNPC()!;

      plumBossNpc.State = NpcState.STATE_SPECIAL;

      return;
    }

    KeysToTheKingdom.bossTimers.set(boss.Index, SPARE_DURATION * 30);

    let effect = Isaac.Spawn(
      EntityType.ENTITY_EFFECT,
      EffectVariant.HALLOWED_GROUND,
      0,
      boss.Position,
      Vector.Zero,
      player,
    ).ToEffect()!;

    effect.LifeSpan = 1;
    effect.FollowParent(boss);

    if (!KeysToTheKingdom.bossTimersPresent) {
      KeysToTheKingdom.bossTimersPresent = true;
      Mod.AddCallback(
        ModCallbacks.MC_POST_UPDATE,
        KeysToTheKingdom.BossRoomPostUpdate,
      );
    }
  }

  private static BossRoomPostUpdate = (): void => {
    let entities = Isaac.GetRoomEntities();
    for (let [bossIndex, duration] of KeysToTheKingdom.bossTimers.entries()) {
      let boss = entities[bossIndex - 1];
      duration -= 1;
      KeysToTheKingdom.bossTimers.set(bossIndex, duration);
      if (duration > 0) continue;

      Isaac.Spawn(
        EntityType.ENTITY_EFFECT,
        EffectVariant.POOF01,
        0,
        boss.Position,
        Vector.Zero,
        boss,
      );
      boss.Remove();

      KeysToTheKingdom.bossTimers.delete(bossIndex);
    }

    if (KeysToTheKingdom.bossTimers.size > 0) return;

    Mod.RemoveCallback(
      ModCallbacks.MC_POST_UPDATE,
      KeysToTheKingdom.BossRoomPostUpdate,
    );
    KeysToTheKingdom.bossTimersPresent = false;
  };

  private static dealHolyDamageToAllEnemies(player: EntityPlayer): void {
    let activeEnemies = getActiveEnemies();
    let smitedAnEnemy = activeEnemies.length > 0;
    for (let enemy of activeEnemies) {
      enemy.TakeDamage(100, 0, EntityRef(player), 0);
      if (enemy.HasMortalDamage()) {
        KeysToTheKingdom.smitedEnemies.add(enemy.Index);
      }

      Isaac.Spawn(
        EntityType.ENTITY_EFFECT,
        EffectVariant.CRACK_THE_SKY,
        DamageFlag.DAMAGE_NO_PENALTIES,
        enemy.Position,
        Vector.Zero,
        undefined,
      );

      enemy.PlaySound(SoundEffect.SOUND_ANGEL_BEAM, 1, 0, false, 0);
    }

    if (!smitedAnEnemy) {
      let room = GAME.GetRoom();
      room.SpawnClearAward();
    }
  }

  private static getCharge(player: EntityPlayer): int {
    return player.GetActiveCharge(ActiveSlot.SLOT_PRIMARY);
  }

  private static addCharge(player: EntityPlayer, charge: number): void {
    let newCharge = clamp(
      KeysToTheKingdom.getCharge(player) + charge,
      0,
      MAX_CHARGE,
    );
    player.SetActiveCharge(newCharge, ActiveSlot.SLOT_PRIMARY);
  }
}
