import Character from "./Character";

// const COSTUME_ID: number = Isaac.GetCostumeIdByPath(
//   "gfx/characters/peter.anm2",
// );

export default class Peter implements Character {
  public constructor() {}

  public Load(player: EntityPlayer): void {
    // player.AddNullCostume(COSTUME_ID);

    // change the player's collision so it doesn't touch pits
    player.GridCollisionClass = EntityGridCollisionClass.GRIDCOLL_NOPITS;
  }
}
