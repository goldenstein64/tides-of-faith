export declare type Conditions = (
  collObj: CollisionObject,
  ent: Entity,
) => boolean;

export declare type CollisionObject = {
  Vec1: { X: number; Y: number };
  Vec2: { X: number; Y: number };
  Id: int;
  CollisionClass: GridCollisionClass;
  Conditions: Conditions | null;
  Remove: () => void;
};

/**
 * Places a CollisionObject in the room
 *
 * @param Vec1 Top-left of rectangle
 * @param Vec2 Bottom-right of rectangle
 * @param collisionClass (optional)
 * @param conditions Gets called on collision. Return true to allow collision (optional)
 * @return CollisionObject #the collision object which you can dynamically adjust
 */
export declare function setCollisionRect(
  Vec1: Vector,
  Vec2: Vector,
  collisionClass: GridCollisionClass,
  conditions: Conditions | null,
): CollisionObject;

/** collisionObjects is mapped by collisionObjId */
export declare function getCollisionObjects(): CollisionObject[];

export declare function areCollisionObjectsPresent(): boolean;

/**
 * Checks if a EntityGridCollisionClass should collide with a GridCollisionClass
 *
 * @param eColClass
 * @param gColClass
 * @param isPlayer Special case for COLLISION_WALL_EXCEPT_PLAYER
 */
export declare function canCollideWithGrid(
  eColClass: EntityGridCollisionClass,
  gColClass: GridCollisionClass,
  isPlayer: boolean,
): boolean;

/** Count of all active collisionObjects in the room */
export declare function getNumCollisionObjects(): number;

/**
 * not necessarily the amount of collisionObjects in the room, as it also
 * counts removed collision objects
 */
export declare function getNumCollisioObjectIds(): number;

/**
 * one-time operation that merges collision objects that could function as one
 * together to improve performance
 *
 * collision objects with collObj.DontMerge = true ignore this
 */
export declare function mergeCollisionObjects(): void;

export declare function reconnectCollisionObjectConditions(
  conditions: Conditions | null,
  hasField: string,
): void;

export function assignGridIndicesToCollisionObjects(): void;

export function getCollisionObjectsByGrid(index: number): CollisionObject;

export function collidesWithCollisionObject(ent: Entity): boolean;

export function collidesWithGrid(ent: Entity): boolean;

export function positionCollidesWithCollisionObject(
  pos: Vector,
  ent: Entity,
): boolean;

export function distanceFromNearestCollisionObject(
  pos: Vector,
): LuaMultiReturn<[number, CollisionObject?]>;

export function entityGridCollisionUpdate(ent: Entity): void;

export function init(mod: Mod): void;

export function reset(): void;
