import Character from "./Character";

// const COSTUME_ID: number = Isaac.GetCostumeIdByPath(
//   "gfx/characters/taintedPeter.anm2",
// );

export default class TaintedPeter implements Character {
  public constructor() {}

  public Load(player: EntityPlayer): void {
    // player.AddNullCostume(COSTUME_ID);

    // change the player's collision so it doesn't touch anything
    player.GridCollisionClass = EntityGridCollisionClass.GRIDCOLL_WALLS;
  }
}
