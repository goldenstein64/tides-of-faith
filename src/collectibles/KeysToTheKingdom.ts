import Loadable from "../Loadable";

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
 * An object that represents the behavior of the item "Keys to the Kingdom."
 */
export default class KeysToTheKingdom implements Loadable {
  private smitedEnemies: Set<int> = new Set();
  private bossFrameCounter: int = 0;
  private damageCounter = 0;

  private static bossTimerStarted = false;

  constructor(
    private mod: Mod,
    private owner: EntityPlayer,
    private activeItemSlot: ActiveSlot,
  ) {}

  Load() {
    this.AddCallbacks();
  }

  private AddCallbacks() {
    this.mod.AddCallback(
      ModCallbacks.MC_USE_ITEM,
      this.UseItem,
      COLLECTIBLE_KEYS_TO_THE_KINGDOM,
    );

    this.mod.AddCallback(
      ModCallbacks.MC_POST_PLAYER_UPDATE,
      this.PostPlayerUpdate,
      PlayerVariant.PLAYER,
    );

    this.mod.AddCallback(
      ModCallbacks.MC_ENTITY_TAKE_DMG,
      this.EntityTakeDamage,
    );
  }

  Unload() {
    this.RemoveCallbacks();
  }

  private RemoveCallbacks() {
    this.mod.RemoveCallback(
      ModCallbacks.MC_USE_ITEM,
      this.UseItem,
      COLLECTIBLE_KEYS_TO_THE_KINGDOM,
    );

    this.mod.RemoveCallback(
      ModCallbacks.MC_POST_PLAYER_UPDATE,
      this.PostPlayerUpdate,
    );

    this.mod.RemoveCallback(
      ModCallbacks.MC_POST_UPDATE,
      this.BossRoomPostUpdate,
    );

    this.mod.RemoveCallback(ModCallbacks.MC_POST_GAME_END, this.Unload);
  }

  private EntityTakeDamage = (
    entity: Entity,
    damageTaken: number,
    damageFlags: DamageFlag,
    damageSource: EntityRef,
    damageCountdownFrames: number,
  ) => {
    if (this.smitedEnemies.has(entity.Index)) {
      this.smitedEnemies.delete(entity.Index);
      return;
    }
    if (!entity.IsActiveEnemy(true)) return;

    this.damageCounter += damageTaken;
    if (this.damageCounter < DAMAGE_PER_CHARGE) return;

    let charges = Math.floor(this.damageCounter / DAMAGE_PER_CHARGE);
    this.damageCounter %= DAMAGE_PER_CHARGE;

    this.addCharge(charges);
  };

  private PostPlayerUpdate = (player: EntityPlayer) => {
    if (player.Index !== this.owner.Index) return;

    if (
      this.owner.GetActiveItem(ActiveSlot.SLOT_PRIMARY) !==
        COLLECTIBLE_KEYS_TO_THE_KINGDOM &&
      this.owner.QueuedItem.Item?.Type !== COLLECTIBLE_KEYS_TO_THE_KINGDOM
    ) {
      this.Unload();
    }
  };

  private UseItem = (
    collectibleType: CollectibleType,
    rng: RNG,
    player: EntityPlayer,
    useFlags: UseFlag,
    activeSlot: number,
    customVarData: number,
  ) => {
    if (this.activeItemSlot !== activeSlot) return;

    let room = GAME.GetRoom();

    this.owner.AnimateCollectible(
      COLLECTIBLE_KEYS_TO_THE_KINGDOM,
      PlayerItemAnimation.USE_ITEM,
      CollectibleAnimation.PLAYER_PICKUP,
    );

    switch (room.GetType()) {
      case RoomType.ROOM_ANGEL:
        this.getKeyPieceOrHolyItem(player);
        break;
      case RoomType.ROOM_DEVIL:
        this.pickOneFreeDevilDeal();
        break;
      case RoomType.ROOM_BOSS:
      case RoomType.ROOM_MINIBOSS:
      case RoomType.ROOM_BOSSRUSH:
        this.startBossSurvivalTimer();
        break;
      default:
        this.dealHolyDamageToAllEnemies(player);
    }
  };

  private getKeyPieceOrHolyItem(player: EntityPlayer) {
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

  private pickOneFreeDevilDeal() {
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

  private startBossSurvivalTimer() {
    let bosses = KeysToTheKingdom.getBosses();
    if (bosses.length == 0) return;

    let plumBoss = bosses.find((e) => e.Type === EntityType.ENTITY_BABY_PLUM);
    if (plumBoss) {
      let plumBossNpc = plumBoss.ToNPC()!;

      plumBossNpc.State = NpcState.STATE_SPECIAL;

      return;
    }

    for (let boss of bosses) {
      let effect = Isaac.Spawn(
        EntityType.ENTITY_EFFECT,
        EffectVariant.HALLOWED_GROUND,
        0,
        boss.Position,
        Vector.Zero,
        this.owner,
      ).ToEffect()!;

      effect.LifeSpan = 1;
      effect.FollowParent(boss);
    }

    this.bossFrameCounter = 10 * 30;

    if (!KeysToTheKingdom.bossTimerStarted) {
      KeysToTheKingdom.bossTimerStarted = true;
      this.mod.AddCallback(
        ModCallbacks.MC_POST_UPDATE,
        this.BossRoomPostUpdate,
      );
    }
  }

  private BossRoomPostUpdate = () => {
    this.bossFrameCounter -= 1;
    if (this.bossFrameCounter > 0) return;

    for (let boss of KeysToTheKingdom.getBosses()) {
      Isaac.Spawn(
        EntityType.ENTITY_EFFECT,
        EffectVariant.POOF01,
        0,
        boss.Position,
        Vector.Zero,
        boss,
      );
      boss.Remove();
    }

    this.mod.RemoveCallback(
      ModCallbacks.MC_POST_UPDATE,
      this.BossRoomPostUpdate,
    );
    KeysToTheKingdom.bossTimerStarted = false;
  };

  private static getBosses() {
    return Isaac.GetRoomEntities().filter(
      (e) => e.IsBoss() || e.Parent?.IsBoss(),
    );
  }

  private dealHolyDamageToAllEnemies(player: EntityPlayer) {
    let smitedAnEnemy = false;
    for (let entity of Isaac.GetRoomEntities()) {
      let npc = entity.ToNPC();

      if (!npc || !npc.IsActiveEnemy(false)) continue;
      smitedAnEnemy = true;

      npc.TakeDamage(100, 0, EntityRef(player), 0);
      if (npc.HasMortalDamage()) {
        this.smitedEnemies.add(npc.Index);
      }
      Isaac.Spawn(
        EntityType.ENTITY_EFFECT,
        EffectVariant.CRACK_THE_SKY,
        DamageFlag.DAMAGE_NO_PENALTIES,
        npc.Position,
        Vector.Zero,
        undefined,
      );
      npc.PlaySound(SoundEffect.SOUND_ANGEL_BEAM, 1, 0, false, 0);
    }
  }

  private getCharge() {
    return this.owner.GetActiveCharge(ActiveSlot.SLOT_PRIMARY);
  }

  private addCharge(charge: number) {
    let newCharge = Math.min(this.getCharge() + charge, MAX_CHARGE);
    this.owner.SetActiveCharge(newCharge, ActiveSlot.SLOT_PRIMARY);
  }
}
