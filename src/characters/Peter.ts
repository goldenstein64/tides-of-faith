import { getPlayerIndex, printConsole } from "isaacscript-common";
import Character from "../Character";
import Mod from "../Mod";
import PeterCollision from "./PeterCollision";

const GAME = Game();

const PLAYERTYPE_PETER = Isaac.GetPlayerTypeByName("Peter", false);

const COLLECTIBLE_KEYS_TO_THE_KINGDOM = Isaac.GetItemIdByName(
  "Keys to the Kingdom",
);

const TRINKET_ALABASTER_SCRAP = Isaac.GetTrinketIdByName("Alabaster Scrap");

const ID_PETERBUCKLE = Isaac.GetCostumeIdByPath(
  "gfx/characters/Costume_PeterBuckle.anm2",
);

const FLOATING_LIMIT = 30;
const PITFALL_TIME = 60;

const DAMAGE_ON_FALL = 1;
const IFRAMES_AFTER_FALL = 120;

const STATS = {
  Speed: 1.0,
  TearDelay: 0,
  Damage: 3.5,
  Range: 6.5,
  ShotSpeed: 1.0,
  Luck: 0.0,
};

/**
 * Represents the behavior of Peter.
 */
export default class Peter implements Character {
  private isInPitfall = false;
  private stopCounter = 0;
  private fallCounter = 0;

  private static charactersLoaded = 0;
  private static addedStaticCallbacks = false;

  constructor(private player: EntityPlayer) {}

  /**
   * Defines what happens when the player is loaded into the game
   */
  Load(): void {
    this.AddCostume();

    this.AddItems();

    this.AddCallbacks();

    this.ModifyStats();
  }

  Unload(): void {
    this.RemoveCallbacks();
  }

  private AddCostume(): void {
    if (ID_PETERBUCKLE !== -1) {
      this.player.AddNullCostume(ID_PETERBUCKLE);
    } else {
      printConsole("PeterBuckle ID was -1!");
    }
  }

  private ModifyStats(): void {
    // give Peter the stuff from STATS
  }

  private AddItems(): void {
    // Peter starts with Keys to the Kingdom
    this.player.AddCollectible(COLLECTIBLE_KEYS_TO_THE_KINGDOM);

    // if Peter has beaten [some boss], give an AlabasterScrap
    let hasBeatenBoss = true;
    if (hasBeatenBoss) {
      this.player.AddTrinket(TRINKET_ALABASTER_SCRAP);
    }
  }

  private AddCallbacks(): void {
    Mod.AddCallback(
      ModCallbacks.MC_POST_PLAYER_UPDATE,
      this.PostPlayerUpdate,
      PlayerVariant.PLAYER,
    );

    Peter.charactersLoaded += 1;

    this.EvaluateStaticCallbacks();
  }

  private RemoveCallbacks(): void {
    Mod.RemoveCallback(
      ModCallbacks.MC_POST_PLAYER_UPDATE,
      this.PostPlayerUpdate,
    );

    Peter.charactersLoaded -= 1;

    this.EvaluateStaticCallbacks();
  }

  private EvaluateStaticCallbacks(): void {
    let charactersPresent = Peter.charactersLoaded > 0;
    if (charactersPresent && !Peter.addedStaticCallbacks) {
      this.AddStaticCallbacks();
    } else if (!charactersPresent && Peter.addedStaticCallbacks) {
      this.RemoveStaticCallbacks();
    }
  }

  private AddStaticCallbacks(): void {
    if (Peter.addedStaticCallbacks) return;
    Peter.addedStaticCallbacks = true;

    PeterCollision.Load();
  }

  private RemoveStaticCallbacks = (): void => {
    if (!Peter.addedStaticCallbacks) return;
    Peter.addedStaticCallbacks = false;

    PeterCollision.Unload();
  };

  private PostPlayerUpdate = (player: EntityPlayer): void => {
    if (
      getPlayerIndex(player) !== getPlayerIndex(this.player) ||
      this.player.IsFlying()
    )
      return;

    if (!this.isInPitfall) {
      this.whileWalking();
    } else {
      this.whileInPitfall();
    }
  };

  private whileWalking(): void {
    let movementInput = this.player.GetMovementInput();
    let gridEntity = GAME.GetRoom().GetGridEntityFromPos(this.player.Position);
    let gridPit = gridEntity?.ToPit();

    let isWalkingOverPit = gridPit && !gridPit.HasLadder;

    if (movementInput.LengthSquared() === 0 && isWalkingOverPit) {
      this.stopCounter += 1;
      if (this.stopCounter > FLOATING_LIMIT) {
        this.player.TakeDamage(
          DAMAGE_ON_FALL,
          DamageFlag.DAMAGE_COUNTDOWN | DamageFlag.DAMAGE_PITFALL,
          EntityRef(undefined),
          IFRAMES_AFTER_FALL,
        );
        this.player.AnimatePitfallIn();
        this.isInPitfall = true;
        this.stopCounter = 0;
      }
    } else {
      this.stopCounter = 0;
    }
  }

  private whileInPitfall(): void {
    this.fallCounter += 1;
    if (this.fallCounter > PITFALL_TIME) {
      let nearestFreePosition = Isaac.GetFreeNearPosition(
        this.player.Position,
        math.huge,
      );
      this.player.Position = nearestFreePosition;
      this.player.AnimatePitfallOut();
      this.isInPitfall = false;
      this.fallCounter = 0;
    }
  }
}
