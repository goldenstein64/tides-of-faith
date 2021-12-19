import { printConsole } from "isaacscript-common";
import Character from "./Character";
import * as CollisionObjects from "./CollisionObjects";
type CollisionObject = CollisionObjects.CollisionObject;

const PLAYERTYPE_PETER = Isaac.GetPlayerTypeByName("Peter", false);

const ID_PETERBUCKLE = Isaac.GetCostumeIdByPath(
  "gfx/characters/Costume_PeterBuckle.anm2",
);

const TILE_RADIUS: Vector = Vector(40, 40).div(2);

const FLOATING_LIMIT: int = 30;
const PITFALL_TIME: int = 60;

const DAMAGE_ON_FALL = 1;
const IFRAMES_ON_FALL: int = 120;

export default class Peter implements Character {
  private isInPitfall = false;
  private stopCounter: int = 0;
  private fallCounter: int = 0;

  private static addedStaticCallbacks = false;
  private static pitCollisionObjects: Map<int, CollisionObject> = new Map();

  constructor(private mod: Mod, private player: EntityPlayer) {}

  AddCallbacks() {
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

    if (Peter.addedStaticCallbacks) return;
    Peter.addedStaticCallbacks = true;

    CollisionObjects.init(this.mod);
    this.mod.AddCallback(ModCallbacks.MC_POST_NEW_ROOM, this.PostNewRoom);
    this.mod.AddCallback(ModCallbacks.MC_POST_UPDATE, this.PostUpdate);
    this.mod.AddCallback(
      ModCallbacks.MC_POST_GAME_END,
      this.RemoveStaticCallbacks,
    );
  }

  private RemoveStaticCallbacks = () => {
    if (!Peter.addedStaticCallbacks) return;
    Peter.addedStaticCallbacks = false;

    CollisionObjects.cleanUp(this.mod);
    this.mod.RemoveCallback(ModCallbacks.MC_POST_NEW_ROOM, this.PostNewRoom);
    this.mod.RemoveCallback(ModCallbacks.MC_POST_UPDATE, this.PostUpdate);
  };

  private PostNewRoom = () => {
    let room: Room = Game().GetRoom();
    let gridSize = room.GetGridSize();
    Peter.pitCollisionObjects.clear();
    for (let i = 1; i <= gridSize; i++) {
      let gridEntity = room.GetGridEntity(i);
      if (!gridEntity) continue;

      let gridType = gridEntity.GetType();
      let existingCollObj = Peter.pitCollisionObjects.get(i);
      if (gridType === GridEntityType.GRID_PIT && !existingCollObj) {
        gridEntity.CollisionClass = GridCollisionClass.COLLISION_NONE;

        let collObj = CollisionObjects.setCollisionRect(
          gridEntity.Position.sub(TILE_RADIUS),
          gridEntity.Position.add(TILE_RADIUS),
          GridCollisionClass.COLLISION_PIT,
          Peter.isNotPlayerOrNotPeter,
        );

        Peter.pitCollisionObjects.set(i, collObj);
      }
    }
  };

  private PostUpdate = () => {
    let room: Room = Game().GetRoom();
    let gridSize = room.GetGridSize();
    for (let i = 1; i <= gridSize; i++) {
      let gridEntity = room.GetGridEntity(i);
      if (!gridEntity) continue;

      let hasPitCollision =
        gridEntity.CollisionClass === GridCollisionClass.COLLISION_PIT;
      let existingCollObj = Peter.pitCollisionObjects.get(i);
      if (hasPitCollision && !existingCollObj) {
        gridEntity.CollisionClass = GridCollisionClass.COLLISION_NONE;

        let collObj = this.createPitCollisionObjectAt(gridEntity.Position);
        Peter.pitCollisionObjects.set(i, collObj);
      } else if (!hasPitCollision && existingCollObj) {
        existingCollObj.Remove();
        Peter.pitCollisionObjects.delete(i);
      }
    }
  };

  private createPitCollisionObjectAt(position: Vector) {
    return CollisionObjects.setCollisionRect(
      position.sub(TILE_RADIUS),
      position.add(TILE_RADIUS),
      GridCollisionClass.COLLISION_PIT,
      Peter.isNotPlayerOrNotPeter,
    );
  }

  private static isNotPlayerOrNotPeter = (
    collObj: CollisionObject,
    ent: Entity,
  ) => {
    let player = ent.ToPlayer();

    return !player || player.GetPlayerType() !== PLAYERTYPE_PETER;
  };

  private postPlayerUpdate = (player: EntityPlayer) => {
    if (player.Index !== this.player.Index) return;

    if (!this.isInPitfall) {
      this.whileWalking();
    } else {
      this.whileInPitfall();
    }
  };

  private whileWalking() {
    let movementInput = this.player.GetMovementInput();
    let gridEntity = Game()
      .GetRoom()
      .GetGridEntityFromPos(this.player.Position);
    let gridPit = gridEntity?.ToPit();

    let isWalkingOverPit = gridPit && !gridPit.HasLadder;

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
