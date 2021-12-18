import { printConsole } from "isaacscript-common";
import Character from "./Character";
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

    printConsole(`${MOD_NAME} initialized.`);
  }

  private addCallbacks(): void {
    this.mod.AddCallback(
      ModCallbacks.MC_POST_PLAYER_INIT,
      (player: EntityPlayer) => {
        this.postPlayerInit(player);
      },
    );
    this.mod.AddCallback(
      ModCallbacks.MC_POST_GAME_STARTED,
      (isContinued: boolean) => {
        this.postGameStarted();
      },
    );
  }

  private postPlayerInit(player: EntityPlayer): void {
    let char: Character;
    switch (player.GetPlayerType()) {
      case PeterPlayerType:
        char = new Peter(this.mod, player);
        this.mod.AddCallback(
          ModCallbacks.MC_POST_PLAYER_UPDATE,
          Peter.PostPlayerUpdate,
        );
        break;
      case TaintedPeterPlayerType:
        char = new TaintedPeter(this.mod, player);
        this.mod.AddCallback(
          ModCallbacks.MC_POST_PLAYER_UPDATE,
          TaintedPeter.PostPlayerUpdate,
        );
        break;
      default:
        return;
    }

    char.Load();
  }

  private postGameStarted(): void {
    printConsole("Callback triggered: MC_POST_GAME_STARTED");
  }
}

export function main(): void {
  const mod = new TidesOfFaith();

  mod.init();
}
