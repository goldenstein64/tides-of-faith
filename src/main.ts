import Peter from "./Peter";
import TaintedPeter from "./TaintedPeter";

const MOD_NAME = "Tides of Faith";

const PeterPlayerType: number = Isaac.GetPlayerTypeByName("Peter", false);
const TaintedPeterPlayerType: number = Isaac.GetPlayerTypeByName("Peter", true);

class TidesOfFaith {
  mod: Mod;

  constructor() {
    // Instantiate a new mod object, which grants the ability to add callback functions that
    // correspond to in-game events
    this.mod = RegisterMod(MOD_NAME, 1);
  }

  init(): void {
    this.addCallbacks();

    Isaac.DebugString(`${MOD_NAME} initialized.`);
  }

  private addCallbacks(): void {
    this.mod.AddCallback(
      ModCallbacks.MC_POST_PLAYER_INIT,
      TidesOfFaith.postPlayerInit,
    );
    this.mod.AddCallback(
      ModCallbacks.MC_POST_GAME_STARTED,
      TidesOfFaith.postGameStarted,
    );
  }

  private static postPlayerInit(this: void, player: EntityPlayer): void {
    switch (player.GetPlayerType()) {
      case PeterPlayerType:
        Peter.Load(player);
        break;
      case TaintedPeterPlayerType:
        TaintedPeter.Load(player);
        break;
      default:
        break;
    }
  }

  private static postGameStarted(this: void): void {
    Isaac.DebugString("Callback triggered: MC_POST_GAME_STARTED");
  }
}

export function main(): void {
  const mod = new TidesOfFaith();

  mod.init();
}
