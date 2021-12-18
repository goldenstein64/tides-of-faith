export default class TaintedPeter {
  constructor(private mod: Mod, private player: EntityPlayer) {}

  Load(): void {
    // change the player's collision so it doesn't touch anything
    this.player.GridCollisionClass = EntityGridCollisionClass.GRIDCOLL_WALLS;
  }

  static PostPlayerUpdate(player: EntityPlayer) {}
}
