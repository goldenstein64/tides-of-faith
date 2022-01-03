import { printConsole } from "isaacscript-common";
import Character from "../Character";
import * as CollisionObjects from "../CollisionObjects";
type CollisionObject = CollisionObjects.CollisionObject;

const GAME = Game();

const PLAYERTYPE_PETER = Isaac.GetPlayerTypeByName("Peter", false);

const COLLECTIBLE_KEYS_TO_THE_KINGDOM = Isaac.GetItemIdByName(
  "Keys to the Kingdom",
);

const TRINKET_ALABASTER_SCRAP = Isaac.GetTrinketIdByName("Alabaster Scrap");

const ID_PETERBUCKLE = Isaac.GetCostumeIdByPath(
  "gfx/characters/Costume_PeterBuckle.anm2",
);

const TILE_RADIUS: Vector = Vector(40, 40).div(2);

const FLOATING_LIMIT: int = 30;
const PITFALL_TIME: int = 60;

const DAMAGE_ON_FALL = 1;
const IFRAMES_ON_FALL: int = 120;

const STATS = {
  Speed: 1.0,
  Tears: 2.73, // +0
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
  private stopCounter: int = 0;
  private fallCounter: int = 0;

  private static charactersLoaded = 0;
  private static addedStaticCallbacks = false;
  private static pitCollisionObjects: Map<int, CollisionObject> = new Map();

  [Symbol.toStringTag]: string = "Peter";

  constructor(private mod: Mod, private player: EntityPlayer) {}

  /**
   * Defines what happens when the player is loaded into the game
   */
  Load() {
    this.AddCostume();

    this.AddItems();

    this.AddCallbacks();

    this.ModifyStats();
  }

  Unload() {
    this.RemoveCallbacks();
  }

  private AddCostume() {
    if (ID_PETERBUCKLE !== -1) {
      this.player.AddNullCostume(ID_PETERBUCKLE);
    } else {
      printConsole("PeterBuckle ID was -1!");
    }
  }

  private ModifyStats() {}

  private AddItems() {
    // Peter starts with Keys to the Kingdom
    this.player.AddCollectible(COLLECTIBLE_KEYS_TO_THE_KINGDOM);

    // if Peter has beaten [some boss], give an AlabasterScrap
    let hasBeatenBoss = true;
    if (hasBeatenBoss) {
      this.player.AddTrinket(TRINKET_ALABASTER_SCRAP);
    }
  }

  private AddCallbacks() {
    this.mod.AddCallback(
      ModCallbacks.MC_POST_PLAYER_UPDATE,
      this.PostPlayerUpdate,
      PlayerVariant.PLAYER,
    );

    Peter.charactersLoaded += 1;

    this.EvaluateStaticCallbacks();
  }

  private RemoveCallbacks() {
    this.mod.RemoveCallback(
      ModCallbacks.MC_POST_PLAYER_UPDATE,
      this.PostPlayerUpdate,
    );

    Peter.charactersLoaded -= 1;

    this.EvaluateStaticCallbacks();
  }

  private EvaluateStaticCallbacks() {
    let charactersPresent = Peter.charactersLoaded > 0;
    if (charactersPresent && !Peter.addedStaticCallbacks) {
      this.AddStaticCallbacks();
    } else if (!charactersPresent && Peter.addedStaticCallbacks) {
      this.RemoveStaticCallbacks();
    }
  }

  private AddStaticCallbacks() {
    Peter.addedStaticCallbacks = true;

    CollisionObjects.init(this.mod);
    this.mod.AddCallback(ModCallbacks.MC_POST_NEW_ROOM, Peter.PostNewRoom);
    this.mod.AddCallback(ModCallbacks.MC_POST_UPDATE, Peter.PostUpdate);
    this.mod.AddCallback(ModCallbacks.MC_FAMILIAR_UPDATE, Peter.FamiliarUpdate);
    this.mod.AddCallback(
      ModCallbacks.MC_POST_GAME_END,
      this.RemoveStaticCallbacks,
    );
  }

  private RemoveStaticCallbacks = () => {
    if (!Peter.addedStaticCallbacks) return;
    Peter.addedStaticCallbacks = false;

    CollisionObjects.cleanUp(this.mod);
    Peter.pitCollisionObjects.clear();
    this.mod.RemoveCallback(ModCallbacks.MC_POST_NEW_ROOM, Peter.PostNewRoom);
    this.mod.RemoveCallback(ModCallbacks.MC_POST_UPDATE, Peter.PostUpdate);
    this.mod.RemoveCallback(
      ModCallbacks.MC_FAMILIAR_UPDATE,
      Peter.FamiliarUpdate,
    );
    this.mod.RemoveCallback(
      ModCallbacks.MC_POST_GAME_END,
      this.RemoveStaticCallbacks,
    );

    let room = GAME.GetRoom();
    let gridSize = room.GetGridSize();
    for (let i = 1; i <= gridSize; i++) {
      Peter.removePitCollisionObject(room, i);
    }

    CollisionObjects.reset();
  };

  private static PostNewRoom = () => {
    let room: Room = GAME.GetRoom();
    let gridSize = room.GetGridSize();
    Peter.pitCollisionObjects.clear();
    for (let i = 1; i <= gridSize; i++) {
      let gridEntity = room.GetGridEntity(i);
      if (gridEntity?.GetType() !== GridEntityType.GRID_PIT) continue;

      Peter.createPitCollisionObject(room, i);
    }
  };

  private static PostUpdate = () => {
    let room: Room = GAME.GetRoom();
    let gridSize = room.GetGridSize();
    for (let i = 1; i <= gridSize; i++) {
      let gridEntity = room.GetGridEntity(i);

      let isPit = gridEntity?.GetType() === GridEntityType.GRID_PIT;
      let collObjExists = Peter.pitCollisionObjects.get(i) !== undefined;
      if (isPit && !collObjExists) {
        Peter.createPitCollisionObject(room, i);
      } else if (!isPit && collObjExists) {
        Peter.removePitCollisionObject(room, i);
      }
    }
  };

  private static createPitCollisionObject(room: Room, gridIndex: int) {
    let gridEntity = room.GetGridEntity(gridIndex);
    let position = room.GetGridPosition(gridIndex);

    let collObj = CollisionObjects.setCollisionRect(
      position.sub(TILE_RADIUS),
      position.add(TILE_RADIUS),
      GridCollisionClass.COLLISION_PIT,
      Peter.isNotPlayerOrNotPeter,
    );

    if (gridEntity) {
      gridEntity.CollisionClass = GridCollisionClass.COLLISION_NONE;
    }

    Peter.pitCollisionObjects.set(gridIndex, collObj);
  }

  private static removePitCollisionObject(room: Room, gridIndex: int) {
    let collObj = Peter.pitCollisionObjects.get(gridIndex);
    let gridEntity = room.GetGridEntity(gridIndex);

    if (collObj) {
      collObj.Remove();
      Peter.pitCollisionObjects.delete(gridIndex);
    }

    if (gridEntity) {
      gridEntity.CollisionClass = GridCollisionClass.COLLISION_PIT;
    }
  }

  private static isNotPlayerOrNotPeter = (
    collObj: CollisionObject,
    ent: Entity,
  ) => {
    let player = ent.ToPlayer();
    return !player || player.GetPlayerType() !== PLAYERTYPE_PETER;
  };

  private PostPlayerUpdate = (player: EntityPlayer) => {
    if (player.Index !== this.player.Index || this.player.IsFlying()) return;

    if (!this.isInPitfall) {
      this.whileWalking();
    } else {
      this.whileInPitfall();
    }
  };

  private static FamiliarUpdate = (familiar: EntityFamiliar) => {
    CollisionObjects.entityGridCollisionUpdate(familiar);
  };

  private whileWalking() {
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
          IFRAMES_ON_FALL,
        );
        this.player.AnimatePitfallIn();
        this.isInPitfall = true;
        this.stopCounter = 0;
      }
    } else {
      this.stopCounter = 0;
    }
  }

  private whileInPitfall() {
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
