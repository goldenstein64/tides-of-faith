export default class TaintedPeter {
  constructor(private mod: Mod) {}

  Load(player: EntityPlayer): void {
    // change the player's collision so it doesn't touch anything
    player.GridCollisionClass = EntityGridCollisionClass.GRIDCOLL_WALLS;
  }
}
