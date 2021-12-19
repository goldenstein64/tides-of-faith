import Character from "./Character";

export default class TaintedPeter implements Character {
  constructor(private mod: Mod, private player: EntityPlayer) {}

  AddCallbacks() {
    // change the player's collision so it doesn't touch anything
    this.player.GridCollisionClass = EntityGridCollisionClass.GRIDCOLL_WALLS;
  }
}
