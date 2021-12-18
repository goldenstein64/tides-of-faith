import { printConsole } from "isaacscript-common";
import * as CollisionObjects from "./CollisionObjects";

const PLAYERTYPE_PETER = Isaac.GetPlayerTypeByName("Peter", false);

const ID_PETERBUCKLE = Isaac.GetCostumeIdByPath(
  "gfx/characters/Costume_PeterBuckle.anm2",
);

const TILE_RADIUS: Vector = Vector(40, 40).div(2);

const FLOATING_LIMIT: int = 30;
const PITFALL_TIME: int = 60;

const DAMAGE_ON_FALL = 1;
const IFRAMES_ON_FALL: int = 120;

declare type RoomConfig = Map<int, CollisionObjects.CollisionObject | null>;

export default class Peter {
  private isInPitfall = false;
  private stopCounter: int = 0;
  private fallCounter: int = 0;

  private playerIndex: int;

  constructor(private mod: Mod, private player: EntityPlayer) {
    this.playerIndex = player.Index;
  }

  Load(): void {
    if (ID_PETERBUCKLE !== -1) {
      this.player.AddNullCostume(ID_PETERBUCKLE);
    } else {
      printConsole("PeterBuckle ID was -1!");
    }

    // change the player's collision so it doesn't touch pits
    this.mod.AddCallback(
      ModCallbacks.MC_POST_PLAYER_UPDATE,
      this.postPlayerUpdate,
    );

    this.mod.RemoveCallback(ModCallbacks.MC_POST_NEW_ROOM, Peter.postNewRoom);
    this.mod.AddCallback(ModCallbacks.MC_POST_NEW_ROOM, Peter.postNewRoom);
  }

  private static postNewRoom = () => {
    CollisionObjects.reset();

    let room: Room = Game().GetRoom();
    let gridSize = room.GetGridSize();
    for (let i = 1; i <= gridSize; i++) {
      let gridEntity = room.GetGridEntity(i);
      if (gridEntity === undefined) continue;

      let gridType = gridEntity.GetType();
      if (gridType === GridEntityType.GRID_PIT) {
        gridEntity.CollisionClass =
          GridCollisionClass.COLLISION_WALL_EXCEPT_PLAYER;

        CollisionObjects.setCollisionRect(
          gridEntity.Position.sub(TILE_RADIUS),
          gridEntity.Position.add(TILE_RADIUS),
          GridCollisionClass.COLLISION_PIT,
          Peter.isPlayerAndNotPeter,
        );
      }
    }
  };

  private static isPlayerAndNotPeter = (
    collObj: CollisionObjects.CollisionObject,
    ent: Entity,
  ) => {
    let player = ent.ToPlayer();

    return player !== undefined && player.GetPlayerType() !== PLAYERTYPE_PETER;
  };

  static PostPlayerUpdate(player: EntityPlayer) {
    CollisionObjects.entityGridCollisionUpdate(player);
  }

  private postPlayerUpdate = (player: EntityPlayer) => {
    CollisionObjects.entityGridCollisionUpdate(player);

    if (player.Index !== this.player.Index) return;

    if (!this.isInPitfall) {
      this.whileWalkingOverPitfall();
    } else {
      this.whileFallingInPitfall();
    }
  };

  private whileWalkingOverPitfall() {
    let movementInput = this.player.GetMovementInput();
    let gridEntity = Game()
      .GetRoom()
      .GetGridEntityFromPos(this.player.Position);
    let gridPit = gridEntity?.ToPit();

    let isWalkingOverPit = gridPit !== undefined && !gridPit.HasLadder;

    if (movementInput.LengthSquared() === 0 && isWalkingOverPit) {
      this.stopCounter += 1;
      if (this.stopCounter > FLOATING_LIMIT) {
        this.player.TakeDamage(
          DAMAGE_ON_FALL,
          DamageFlag.DAMAGE_COUNTDOWN,
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

  private whileFallingInPitfall() {
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
