import { getPlayerIndex, printConsole } from "isaacscript-common";
import Character from "./Character";
import Peter from "./characters/Peter";
import TaintedPeter from "./characters/TaintedPeter";
import KeysToTheKingdom from "./collectibles/KeysToTheKingdom";
import Mod from "./Mod";
import AlabasterScrap from "./trinkets/AlabasterScrap";

type PlayerIndex = int;

const PLAYERTYPE_PETER: number = Isaac.GetPlayerTypeByName("Peter", false);
const PLAYERTYPE_TAINTED_PETER: number = Isaac.GetPlayerTypeByName(
  "Peter",
  true,
);

const COLLECTIBLE_KEYS_TO_THE_KINGDOM: CollectibleType = Isaac.GetItemIdByName(
  "Keys to the Kingdom",
);
const TRINKET_ALABASTER_SCRAP: TrinketType =
  Isaac.GetTrinketIdByName("Alabaster Scrap");

const ALL_TRINKET_SLOTS = [TrinketSlot.SLOT_1, TrinketSlot.SLOT_2];

const ALL_ACTIVE_ITEM_SLOTS = [
  ActiveSlot.SLOT_PRIMARY,
  ActiveSlot.SLOT_SECONDARY,
  ActiveSlot.SLOT_POCKET,
  ActiveSlot.SLOT_POCKET2,
];

class TidesOfFaith {
  private evalActiveItems = new Map<
    PlayerIndex,
    Map<ActiveSlot, CollectibleType>
  >();
  private alabasterScrapObjects = new Map<PlayerIndex, AlabasterScrap[]>();
  private keysToTheKingdomObjects = new Map<
    PlayerIndex,
    Map<ActiveSlot, KeysToTheKingdom>
  >();
  private evalPlayerTypes = new Map<PlayerIndex, PlayerType>();

  private characters = new Map<PlayerIndex, Character>();

  constructor() {}

  Init(): void {
    this.AddCallbacks();

    printConsole(`${Mod.Name} initialized.`);
  }

  private AddCallbacks(): void {
    Mod.AddCallback(
      ModCallbacks.MC_POST_PLAYER_INIT,
      this.PostPlayerInit,
      PlayerVariant.PLAYER,
    );

    Mod.AddCallback(
      ModCallbacks.MC_POST_PLAYER_UPDATE,
      this.PostPlayerUpdate,
      PlayerVariant.PLAYER,
    );
    Mod.AddCallback(ModCallbacks.MC_POST_GAME_END, this.PostGameEnd);

    KeysToTheKingdom.StaticLoad();
  }

  private PostPlayerInit = (player: EntityPlayer): void => {
    this.LoadCharacter(player);
  };

  private PostPlayerUpdate = (player: EntityPlayer): void => {
    this.evaluatePlayerType(player);

    this.evaluateActiveItems(player);

    this.evaluateAlabasterScrapCount(player);
  };

  private evaluatePlayerType(player: EntityPlayer): void {
    let oldType = this.evalPlayerTypes.get(getPlayerIndex(player));
    if (oldType === player.GetPlayerType()) return;

    this.LoadCharacter(player);
  }

  private LoadCharacter(player: EntityPlayer): void {
    let playerType = player.GetPlayerType();

    this.evalPlayerTypes.set(getPlayerIndex(player), playerType);

    // unload the old character in case they got morphed from another modded
    // character
    let oldCharacter = this.characters.get(getPlayerIndex(player));
    if (oldCharacter) {
      oldCharacter.Unload();
      this.characters.delete(getPlayerIndex(player));
    }

    // load in the new character
    let newCharacter: Character | undefined = undefined;
    switch (playerType) {
      case PLAYERTYPE_PETER:
        newCharacter = new Peter(player);
        break;
      case PLAYERTYPE_TAINTED_PETER:
        newCharacter = new TaintedPeter(player);
        break;
    }

    if (newCharacter) {
      newCharacter.Load();
      this.characters.set(getPlayerIndex(player), newCharacter);
    }
  }

  private evaluateActiveItems(player: EntityPlayer): void {
    let activeItems = this.evalActiveItems.get(getPlayerIndex(player));
    if (activeItems === undefined) {
      activeItems = new Map();
      this.evalActiveItems.set(getPlayerIndex(player), activeItems);
    }

    let keyObjects = this.keysToTheKingdomObjects.get(getPlayerIndex(player));
    if (keyObjects === undefined) {
      keyObjects = new Map();
      this.keysToTheKingdomObjects.set(getPlayerIndex(player), keyObjects);
    }

    for (const slot of ALL_ACTIVE_ITEM_SLOTS) {
      let oldItem = activeItems.get(slot);
      let newItem = player.GetActiveItem(slot);

      if (oldItem === newItem) continue;
      activeItems.set(slot, newItem);

      switch (oldItem) {
        case COLLECTIBLE_KEYS_TO_THE_KINGDOM:
          let keys = keyObjects.get(slot)!;
          keys.Unload();
          keyObjects.delete(slot);
          break;
      }

      switch (newItem) {
        case COLLECTIBLE_KEYS_TO_THE_KINGDOM:
          let keys = new KeysToTheKingdom(player);
          keys.Load();
          keyObjects.set(slot, keys);
          break;
      }
    }
  }

  private evaluateAlabasterScrapCount(player: EntityPlayer): void {
    let playerScraps = this.getAlabasterScrapCount(player);
    let evalScraps = this.getAlabasterScrapObjects(player);

    let scrapDelta = playerScraps - evalScraps.length;

    while (scrapDelta < 0) {
      scrapDelta += 1;

      let scrap = evalScraps.pop()!;
      scrap.Unload();
    }

    while (scrapDelta > 0) {
      scrapDelta -= 1;

      let scrap = new AlabasterScrap(player);
      scrap.Load();
      evalScraps.push(scrap);
    }
  }

  private getAlabasterScrapCount(player: EntityPlayer): int {
    let result = 0;
    for (const trinketSlot of ALL_TRINKET_SLOTS) {
      let trinket = player.GetTrinket(trinketSlot);
      if (trinket === TRINKET_ALABASTER_SCRAP) {
        result += 1;
      }
    }

    return result;
  }

  private getAlabasterScrapObjects(player: EntityPlayer): AlabasterScrap[] {
    let result = this.alabasterScrapObjects.get(getPlayerIndex(player));
    if (!result) {
      result = [];
      this.alabasterScrapObjects.set(getPlayerIndex(player), result);
    }

    return result;
  }

  private PostGameEnd = (): void => {
    this.evalActiveItems.clear();

    for (let keyObjects of this.keysToTheKingdomObjects.values()) {
      for (let keys of keyObjects.values()) {
        keys.Unload();
      }
    }
    this.keysToTheKingdomObjects.clear();

    for (let scraps of this.alabasterScrapObjects.values()) {
      for (let scrap of scraps) {
        scrap.Unload();
      }
    }
    this.alabasterScrapObjects.clear();

    for (let character of this.characters.values()) {
      character.Unload();
    }
    this.characters.clear();

    KeysToTheKingdom.StaticUnload();
  };
}

export function main(): void {
  const tidesOfFaith = new TidesOfFaith();

  tidesOfFaith.Init();
}
