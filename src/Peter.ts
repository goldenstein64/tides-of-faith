// const COSTUME_ID: number = Isaac.GetCostumeIdByPath(
//   "gfx/characters/peter.anm2",
// );

export default class Peter {
  constructor(private mod: Mod) {}

  Load(player: EntityPlayer): void {
    // player.AddNullCostume(COSTUME_ID);

    // change the player's collision so it doesn't touch pits
    player.GridCollisionClass = EntityGridCollisionClass.GRIDCOLL_NOPITS;
  }
}
