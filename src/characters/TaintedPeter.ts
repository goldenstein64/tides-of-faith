import Character from "../Character";

/**
 * Represents the behavior of Tainted Peter
 */
export default class TaintedPeter implements Character {
  constructor(private player: EntityPlayer) {}

  Load(): void {
    // change the player's collision so it doesn't touch anything
    this.player.GridCollisionClass = EntityGridCollisionClass.GRIDCOLL_WALLS;
  }

  Unload(): void {}
}
