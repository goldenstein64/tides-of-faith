import { printConsole } from "isaacscript-common";
import * as CollisionObjects from "./CollisionObjects";

const PLAYERTYPE_PETER = Isaac.GetPlayerTypeByName("Peter", false);

const ID_PETERBUCKLE = Isaac.GetCostumeIdByPath(
  "gfx/characters/Costume_PeterBuckle.anm2",
);

const TILE_RADIUS = Vector(40, 40).div(2);

declare type RoomConfig = Map<int, CollisionObjects.CollisionObject | null>;

export default class Peter {
  private roomConfig: RoomConfig = new Map();
  private frameCounter: int = 0;

  constructor(private mod: Mod) {}

  Load(player: EntityPlayer): void {
    if (ID_PETERBUCKLE !== -1) {
      player.AddNullCostume(ID_PETERBUCKLE);
    } else {
      printConsole("PeterBuckle ID was -1!");
    }

    // change the player's collision so it doesn't touch pits
    this.mod.AddCallback(
      ModCallbacks.MC_POST_PLAYER_UPDATE,
      this.postPlayerUpdate,
    );

    this.mod.AddCallback(ModCallbacks.MC_POST_NEW_ROOM, this.postNewRoom);

    // TODO: find a way to listen to GridEntity updates and create/remove collision rects accordingly
    this.mod.AddCallback(
      ModCallbacks.MC_POST_GAME_STARTED,
      this.postGameStarted,
    );

    this.mod.AddCallback(ModCallbacks.MC_POST_GAME_END, this.postGameEnd);
  }

  private postGameStarted = (isContinued: boolean) => {
    this.mod.AddCallback(ModCallbacks.MC_POST_UPDATE, this.postGameUpdate);
  };

  private postGameEnd = (isGameOver: boolean) => {
    this.mod.RemoveCallback(ModCallbacks.MC_POST_UPDATE, this.postGameUpdate);
  };

  private postNewRoom = () => {
    CollisionObjects.reset();

    let room: Room = Game().GetRoom();
    let gridSize = room.GetGridSize();
    this.roomConfig.clear();
    for (let i = 1; i <= gridSize; i++) {
      let gridEntity = room.GetGridEntity(i);
      if (gridEntity === undefined) continue;

      let collisionClass = gridEntity.CollisionClass;
      if (
        collisionClass === GridCollisionClass.COLLISION_SOLID ||
        collisionClass === GridCollisionClass.COLLISION_OBJECT
      ) {
        let collObj = CollisionObjects.setCollisionRect(
          gridEntity.Position.sub(TILE_RADIUS),
          gridEntity.Position.add(TILE_RADIUS),
          GridCollisionClass.COLLISION_WALL,
          this.isPlayerAndPeter,
        );

        this.roomConfig.set(i, collObj);
      } else {
        this.roomConfig.set(i, null);
      }
    }
  };

  private postGameUpdate = () => {
    // for every collision object, check if its corresponding grid entity still exists
    // try to detect new blockable grid entities and add a collision object for each one
    let room: Room = Game().GetRoom();

    for (let [index, collisionObj] of this.roomConfig.entries()) {
      let gridEntity = room.GetGridEntity(index);

      if (
        gridEntity !== undefined &&
        (gridEntity.CollisionClass === GridCollisionClass.COLLISION_SOLID ||
          gridEntity.CollisionClass === GridCollisionClass.COLLISION_OBJECT)
      ) {
        if (collisionObj === null) {
          collisionObj = CollisionObjects.setCollisionRect(
            gridEntity.Position.sub(TILE_RADIUS),
            gridEntity.Position.add(TILE_RADIUS),
            GridCollisionClass.COLLISION_WALL,
            this.isPlayerAndPeter,
          );
          this.roomConfig.set(index, collisionObj);
        }
      } else {
        if (collisionObj === null) continue;
        collisionObj.Remove();
        this.roomConfig.set(index, null);
      }
    }
  };

  private isPlayerAndPeter: CollisionObjects.Conditions = (
    collObj: CollisionObjects.CollisionObject,
    ent: Entity,
  ) => {
    if (ent === undefined) return false;
    let player: EntityPlayer | undefined = ent.ToPlayer();

    return player !== undefined && player.GetPlayerType() === PLAYERTYPE_PETER;
  };

  private postPlayerUpdate = (player: EntityPlayer) => {
    if (player.GetPlayerType() !== PLAYERTYPE_PETER) return;

    CollisionObjects.entityGridCollisionUpdate(player);

    this.frameCounter += 1;
    if (this.frameCounter !== 2) return;

    player.GridCollisionClass = EntityGridCollisionClass.GRIDCOLL_WALLS;
  };
}
