import { printConsole } from "isaacscript-common";
import Character from "./Character";
import Peter from "./characters/Peter";
import TaintedPeter from "./characters/TaintedPeter";
import KeysToTheKingdom from "./collectibles/KeysToTheKingdom";
import AlabasterScrap from "./trinkets/AlabasterScrap";

type PlayerIndex = int;

const MOD_NAME = "Tides of Faith";

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

const TRINKET_SLOTS = [TrinketSlot.SLOT_1, TrinketSlot.SLOT_2];
const ACTIVE_ITEM_SLOTS = [
  ActiveSlot.SLOT_PRIMARY,
  ActiveSlot.SLOT_SECONDARY,
  ActiveSlot.SLOT_POCKET,
  ActiveSlot.SLOT_POCKET2,
];

/**
 * Represents the mod's behavior
 */
class TidesOfFaith {
  private evalActiveItems: Map<PlayerIndex, Map<ActiveSlot, CollectibleType>> =
    new Map();
  private alabasterScrapObjects: Map<PlayerIndex, AlabasterScrap[]> = new Map();
  private keysToTheKingdomObjects: Map<
    PlayerIndex,
    Map<ActiveSlot, KeysToTheKingdom>
  > = new Map();
  private evalPlayerTypes: Map<PlayerIndex, PlayerType> = new Map();

  private characters: Map<PlayerIndex, Character> = new Map();

  private mod: Mod = RegisterMod(MOD_NAME, 1);

  constructor() {}

  Init(): void {
    this.AddCallbacks();

    printConsole(`${MOD_NAME} initialized.`);
  }

  private AddCallbacks() {
    this.mod.AddCallback(
      ModCallbacks.MC_POST_PLAYER_INIT,
      this.PostPlayerInit,
      PlayerVariant.PLAYER,
    );

    this.mod.AddCallback(
      ModCallbacks.MC_POST_PLAYER_UPDATE,
      this.PostPlayerUpdate,
      PlayerVariant.PLAYER,
    );
    this.mod.AddCallback(ModCallbacks.MC_POST_GAME_END, this.PostGameEnd);

    this.mod.AddCallback(ModCallbacks.MC_EXECUTE_CMD, this.ExecuteCommand);
  }

  private PostPlayerInit = (player: EntityPlayer) => {
    this.LoadCharacter(player);
  };

  private PostPlayerUpdate = (player: EntityPlayer) => {
    this.evaluatePlayerType(player);

    this.evaluateActiveItems(player);

    this.evaluateAlabasterScrapCount(player);
  };

  private evaluatePlayerType(player: EntityPlayer) {
    let oldType = this.evalPlayerTypes.get(player.Index);
    if (oldType === player.GetPlayerType()) return;

    this.LoadCharacter(player);
  }

  private LoadCharacter(player: EntityPlayer) {
    let playerType = player.GetPlayerType();

    this.evalPlayerTypes.set(player.Index, playerType);

    // unload the old character in case they got morphed from another modded
    // character
    let oldCharacter = this.characters.get(player.Index);
    if (oldCharacter) {
      oldCharacter.Unload();
      this.characters.delete(player.Index);
    }

    // load in the new character
    let newCharacter: Character | undefined = undefined;
    switch (playerType) {
      case PLAYERTYPE_PETER:
        newCharacter = new Peter(this.mod, player);
        break;
      case PLAYERTYPE_TAINTED_PETER:
        newCharacter = new TaintedPeter(this.mod, player);
        break;
    }

    if (newCharacter) {
      newCharacter.Load();
      this.characters.set(player.Index, newCharacter);
    }
  }

  private evaluateActiveItems(player: EntityPlayer) {
    let activeItems = this.evalActiveItems.get(player.Index);
    if (activeItems === undefined) {
      activeItems = new Map();
      this.evalActiveItems.set(player.Index, activeItems);
    }

    let keyObjects = this.keysToTheKingdomObjects.get(player.Index);
    if (keyObjects === undefined) {
      keyObjects = new Map();
      this.keysToTheKingdomObjects.set(player.Index, keyObjects);
    }

    for (const slot of ACTIVE_ITEM_SLOTS) {
      let oldItem = activeItems.get(slot);
      let newItem = player.GetActiveItem(slot);

      if (oldItem === newItem) continue;
      activeItems.set(slot, newItem);

      switch (oldItem) {
        case COLLECTIBLE_KEYS_TO_THE_KINGDOM:
          let keys = keyObjects.get(slot)!;
          keys.Unload();
          break;
      }

      switch (newItem) {
        case COLLECTIBLE_KEYS_TO_THE_KINGDOM:
          let keys = new KeysToTheKingdom(this.mod, player, slot);
          keys.Load();
          keyObjects.set(slot, keys);
          break;
      }
    }
  }

  private evaluateAlabasterScrapCount(player: EntityPlayer) {
    let evalScraps = this.getAlabasterScrapCount(player);
    let playerScraps = this.getAlabasterScrapObjects(player);

    let scrapDelta = evalScraps - playerScraps.length;

    while (scrapDelta < 0) {
      scrapDelta += 1;

      let scrap = playerScraps.pop()!;
      scrap.Unload();
    }

    while (scrapDelta > 0) {
      scrapDelta -= 1;

      let scrap = new AlabasterScrap(this.mod, player);
      scrap.Load();
      playerScraps.push(scrap);
    }
  }

  private getAlabasterScrapCount(player: EntityPlayer) {
    let result = 0;
    for (const trinketSlot of TRINKET_SLOTS) {
      let trinket = player.GetTrinket(trinketSlot);
      if (trinket === TRINKET_ALABASTER_SCRAP) {
        result += 1;
      }
    }

    return result;
  }

  private getAlabasterScrapObjects(player: EntityPlayer) {
    let result = this.alabasterScrapObjects.get(player.Index);
    if (!result) {
      result = [];
      this.alabasterScrapObjects.set(player.Index, result);
    }

    return result;
  }

  private PostGameEnd = () => {
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
  };

  private ExecuteCommand = (
    command: string,
    params: string,
    player: EntityPlayer,
  ) => {
    if (command.toLowerCase() == "chances") {
      let room = Game().GetRoom();
      let level = Game().GetLevel();

      printConsole(room.GetDevilRoomChance().toString());
      printConsole(level.GetAngelRoomChance().toString());
    }
  };
}

export function main() {
  const mod = new TidesOfFaith();

  mod.Init();
}
