export default class TaintedPeter implements Character {
  private mod: Mod;

  public constructor(mod: Mod) {
    this.mod = mod;
  }

  public Load(player: EntityPlayer) {
    this.AddCostume(player);
  }

  private AddCostume(player: EntityPlayer) {
    let costume: number = Isaac.GetCostumeIdByPath("gfx/characters/taintedPeter.anm2");
    player.AddNullCostume(costume);
  }
}