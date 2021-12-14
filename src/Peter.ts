export default class Peter implements Character {
  private mod: Mod;

  public constructor(mod: Mod) {
    this.mod = mod;
  }

  public Load(player: EntityPlayer): void {
    this.AddCostume(player);
  }

  private AddCostume(player: EntityPlayer): void {
    let costume: number = Isaac.GetCostumeIdByPath("gfx/characters/peter.anm2");
    player.AddNullCostume(costume);
  }
}
