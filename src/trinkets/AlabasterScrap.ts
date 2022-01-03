import Loadable from "../Loadable";

const COLLECTIBLE_ALABASTER_SCRAP = Isaac.GetItemIdByName("Alabaster Scrap");

const ANGELIC_ITEMS: Set<CollectibleType> = new Set([
  CollectibleType.COLLECTIBLE_SPIRIT_SWORD,
  CollectibleType.COLLECTIBLE_SPEAR_OF_DESTINY,
]);

const ANGELIC_TRINKETS: Set<TrinketType> = new Set();

const BUFF_PER_ITEM = 0.2;

/**
 * An object representing the behavior of the item "Alabaster Scrap"
 */
export default class AlabasterScrap implements Loadable {
  private evalCollectibleMap: Map<CollectibleType, int> = new Map();

  constructor(private mod: Mod, private owner: EntityPlayer) {}

  Load() {
    this.AddCallbacks();
  }

  private AddCallbacks() {
    this.mod.AddCallback(ModCallbacks.MC_EVALUATE_CACHE, this.EvaluateCache);

    this.mod.AddCallback(
      ModCallbacks.MC_POST_PLAYER_UPDATE,
      this.PostPlayerUpdate,
      PlayerVariant.PLAYER,
    );

    this.owner.AddCacheFlags(CacheFlag.CACHE_DAMAGE);
    this.owner.EvaluateItems();
  }

  Unload() {
    this.RemoveCallbacks();

    this.owner.AddCacheFlags(CacheFlag.CACHE_DAMAGE);
    this.owner.EvaluateItems();
  }

  private RemoveCallbacks() {
    this.mod.RemoveCallback(ModCallbacks.MC_EVALUATE_CACHE, this.EvaluateCache);

    this.mod.RemoveCallback(
      ModCallbacks.MC_POST_PLAYER_UPDATE,
      this.PostPlayerUpdate,
    );
  }

  private PostPlayerUpdate = (player: EntityPlayer) => {
    if (player.Index !== this.owner.Index) return;

    if (this.shouldRecalculateDamageBuff()) {
      this.owner.AddCacheFlags(CacheFlag.CACHE_DAMAGE);
      this.owner.EvaluateItems();
    }
  };

  private EvaluateCache = (player: EntityPlayer, cacheFlag: CacheFlag) => {
    if (
      (cacheFlag & CacheFlag.CACHE_DAMAGE) === 0 ||
      player.Index !== this.owner.Index
    )
      return;

    let newDamageBuff = this.calculateDamageBuff();

    this.owner.Damage += newDamageBuff;
  };

  private shouldRecalculateDamageBuff() {
    for (let item of ANGELIC_ITEMS.values()) {
      let actual = this.owner.GetCollectibleNum(item);
      let expected = this.evalCollectibleMap.get(item);
      if (actual !== expected) {
        return true;
      }
    }

    return false;
  }

  private calculateDamageBuff() {
    let newDamageBuff = 0;
    for (let item of ANGELIC_ITEMS.values()) {
      let itemCount = this.owner.GetCollectibleNum(item);
      this.evalCollectibleMap.set(item, itemCount);
      newDamageBuff += itemCount;
    }

    return newDamageBuff * BUFF_PER_ITEM;
  }
}
