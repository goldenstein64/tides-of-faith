import Character from "../Character";

export default class TaintedPeter implements Character {
  [Symbol.toStringTag]: string = "TaintedPeter";

  constructor(private mod: Mod, private player: EntityPlayer) {}

  Load() {
    // change the player's collision so it doesn't touch anything
    this.player.GridCollisionClass = EntityGridCollisionClass.GRIDCOLL_WALLS;
  }

  Unload() {}
}
