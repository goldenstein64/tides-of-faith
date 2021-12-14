import Character from "./Character";
import Peter from "./Peter";
import TaintedPeter from "./TaintedPeter";

const MOD_NAME = "Tides of Faith";

const PeterPlayerType: number = Isaac.GetPlayerTypeByName("Peter", false);
const TaintedPeterPlayerType: number = Isaac.GetPlayerTypeByName("Peter", true);

class TidesOfFaith {
  private mod: Mod;

  public constructor() {
    // Instantiate a new mod object, which grants the ability to add callback functions that
    // correspond to in-game events
    this.mod = RegisterMod(MOD_NAME, 1);
  }

  public init(): void {
    this.addCallbacks();

    Isaac.DebugString(`${MOD_NAME} initialized.`);
  }

  private addCallbacks(): void {
    this.mod.AddCallback(ModCallbacks.MC_POST_PLAYER_INIT, this.postPlayerInit);
    this.mod.AddCallback(
      ModCallbacks.MC_POST_GAME_STARTED,
      this.postGameStarted,
    );
  }

  private postPlayerInit(player: EntityPlayer): void {
    let char: Character;
    switch (player.GetPlayerType()) {
      case PeterPlayerType:
        char = new Peter();
        break;
      case TaintedPeterPlayerType:
        char = new TaintedPeter();
        break;
      default:
        return;
    }

    char.Load(player);
  }

  private postGameStarted(): void {
    Isaac.DebugString("Callback triggered: MC_POST_GAME_STARTED");
  }
}

export function main(): void {
  const mod = new TidesOfFaith();

  mod.init();
}
