import * as CollisionObjects from "../CollisionObjects";
import Mod from "../Mod";

type CollisionObject = CollisionObjects.CollisionObject;

const GAME = Game();

const PLAYERTYPE_PETER = Isaac.GetPlayerTypeByName("Peter", false);

const TILE_RADIUS = Vector(40, 40).div(2);

export default class PeterCollision {
  private static pitCollisionObjects = new Map<int, CollisionObject>();

  static Load(): void {
    PeterCollision.AddCallbacks();
  }

  static Unload(): void {
    PeterCollision.RemoveCallbacks();

    let room = GAME.GetRoom();
    let gridSize = room.GetGridSize();
    for (let i = 1; i <= gridSize; i++) {
      PeterCollision.removePitCollisionObject(room, i);
    }

    PeterCollision.pitCollisionObjects.clear();
    CollisionObjects.reset();
  }

  private static AddCallbacks(): void {
    CollisionObjects.init(Mod);
    Mod.AddCallback(ModCallbacks.MC_POST_NEW_ROOM, PeterCollision.PostNewRoom);
    Mod.AddCallback(ModCallbacks.MC_POST_UPDATE, PeterCollision.PostUpdate);
    Mod.AddCallback(
      ModCallbacks.MC_FAMILIAR_UPDATE,
      PeterCollision.FamiliarUpdate,
    );
  }

  private static RemoveCallbacks(): void {
    CollisionObjects.cleanUp(Mod);
    Mod.RemoveCallback(
      ModCallbacks.MC_POST_NEW_ROOM,
      PeterCollision.PostNewRoom,
    );
    Mod.RemoveCallback(ModCallbacks.MC_POST_UPDATE, PeterCollision.PostUpdate);
    Mod.RemoveCallback(
      ModCallbacks.MC_FAMILIAR_UPDATE,
      PeterCollision.FamiliarUpdate,
    );
  }

  private static PostNewRoom = (): void => {
    let room: Room = GAME.GetRoom();
    let gridSize = room.GetGridSize();
    PeterCollision.pitCollisionObjects.clear();
    for (let i = 1; i <= gridSize; i++) {
      let gridEntity = room.GetGridEntity(i);
      if (gridEntity?.GetType() !== GridEntityType.GRID_PIT) continue;

      PeterCollision.createPitCollisionObject(room, i);
    }
  };

  private static PostUpdate = (): void => {
    let room: Room = GAME.GetRoom();
    let gridSize = room.GetGridSize();
    for (let i = 1; i <= gridSize; i++) {
      let gridEntity = room.GetGridEntity(i);

      let isPit = gridEntity?.GetType() === GridEntityType.GRID_PIT;
      let collObjExists =
        PeterCollision.pitCollisionObjects.get(i) !== undefined;
      if (isPit && !collObjExists) {
        PeterCollision.createPitCollisionObject(room, i);
      } else if (!isPit && collObjExists) {
        PeterCollision.removePitCollisionObject(room, i);
      }
    }
  };

  private static FamiliarUpdate = (familiar: EntityFamiliar): void => {
    CollisionObjects.entityGridCollisionUpdate(familiar);
  };

  private static createPitCollisionObject(room: Room, gridIndex: int): void {
    let gridEntity = room.GetGridEntity(gridIndex);
    let position = room.GetGridPosition(gridIndex);

    let collObj = CollisionObjects.setCollisionRect(
      position.sub(TILE_RADIUS),
      position.add(TILE_RADIUS),
      GridCollisionClass.COLLISION_PIT,
      PeterCollision.isNotPlayerOrNotPeter,
    );

    if (gridEntity) {
      gridEntity.CollisionClass = GridCollisionClass.COLLISION_NONE;
    }

    PeterCollision.pitCollisionObjects.set(gridIndex, collObj);
  }

  private static removePitCollisionObject(room: Room, gridIndex: int): void {
    let collObj = PeterCollision.pitCollisionObjects.get(gridIndex);
    let gridEntity = room.GetGridEntity(gridIndex);

    if (collObj) {
      collObj.Remove();
      PeterCollision.pitCollisionObjects.delete(gridIndex);
    }

    if (gridEntity) {
      gridEntity.CollisionClass = GridCollisionClass.COLLISION_PIT;
    }
  }

  private static isNotPlayerOrNotPeter = (
    collObj: CollisionObject,
    ent: Entity,
  ): boolean => {
    let player = ent.ToPlayer();
    return !player || player.GetPlayerType() !== PLAYERTYPE_PETER;
  };
}
