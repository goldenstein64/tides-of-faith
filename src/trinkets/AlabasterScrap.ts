import { getPlayerIndex } from "isaacscript-common";
import Loadable from "../Loadable";
import Mod from "../Mod";

const COLLECTIBLE_ALABASTER_SCRAP = Isaac.GetItemIdByName("Alabaster Scrap");

const ANGELIC_ITEMS = new Set<CollectibleType>([
  CollectibleType.COLLECTIBLE_SPIRIT_SWORD,
  CollectibleType.COLLECTIBLE_SPEAR_OF_DESTINY,
]);

const ANGELIC_TRINKETS = new Set<TrinketType>();

const BUFF_PER_ITEM = 0.2;

/**
 * An object representing the behavior of the item "Alabaster Scrap"
 */
export default class AlabasterScrap implements Loadable {
  private evalCollectibleMap = new Map<CollectibleType, int>();

  constructor(private owner: EntityPlayer) {}

  Load(): void {
    this.AddCallbacks();
  }

  private AddCallbacks(): void {
    Mod.AddCallback(ModCallbacks.MC_EVALUATE_CACHE, this.EvaluateCache);

    Mod.AddCallback(
      ModCallbacks.MC_POST_PLAYER_UPDATE,
      this.PostPlayerUpdate,
      PlayerVariant.PLAYER,
    );

    this.owner.AddCacheFlags(CacheFlag.CACHE_DAMAGE);
    this.owner.EvaluateItems();
  }

  Unload(): void {
    this.RemoveCallbacks();

    this.owner.AddCacheFlags(CacheFlag.CACHE_DAMAGE);
    this.owner.EvaluateItems();
  }

  private RemoveCallbacks(): void {
    Mod.RemoveCallback(ModCallbacks.MC_EVALUATE_CACHE, this.EvaluateCache);

    Mod.RemoveCallback(
      ModCallbacks.MC_POST_PLAYER_UPDATE,
      this.PostPlayerUpdate,
    );
  }

  private PostPlayerUpdate = (player: EntityPlayer): void => {
    if (getPlayerIndex(player) !== getPlayerIndex(this.owner)) return;

    if (this.shouldRecalculateDamageBuff()) {
      this.owner.AddCacheFlags(CacheFlag.CACHE_DAMAGE);
      this.owner.EvaluateItems();
    }
  };

  private EvaluateCache = (
    player: EntityPlayer,
    cacheFlag: CacheFlag,
  ): void => {
    if (
      (cacheFlag & CacheFlag.CACHE_DAMAGE) === 0 ||
      getPlayerIndex(player) !== getPlayerIndex(this.owner)
    )
      return;

    let newDamageBuff = this.calculateDamageBuff();

    this.owner.Damage += newDamageBuff;
  };

  private shouldRecalculateDamageBuff(): boolean {
    for (let item of ANGELIC_ITEMS.values()) {
      let actual = this.owner.GetCollectibleNum(item);
      let expected = this.evalCollectibleMap.get(item);
      if (actual !== expected) {
        return true;
      }
    }

    return false;
  }

  private calculateDamageBuff(): number {
    let newDamageBuff = 0;
    for (let item of ANGELIC_ITEMS.values()) {
      let itemCount = this.owner.GetCollectibleNum(item);
      this.evalCollectibleMap.set(item, itemCount);
      newDamageBuff += itemCount;
    }

    return newDamageBuff * BUFF_PER_ITEM;
  }
}
