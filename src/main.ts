import { printConsole } from "isaacscript-common";
import Peter from "./Peter";
import TaintedPeter from "./TaintedPeter";

const MOD_NAME = "Tides of Faith";

const PLAYERTYPE_PETER: number = Isaac.GetPlayerTypeByName("Peter", false);
const PLAYERTYPE_TAINTEDPETER: number = Isaac.GetPlayerTypeByName(
  "Peter",
  true,
);

class TidesOfFaith {
  mod: Mod;

  constructor() {
    // Instantiate a new mod object, which grants the ability to add callback functions that
    // correspond to in-game events
    this.mod = RegisterMod(MOD_NAME, 1);
  }

  Init(): void {
    this.AddCallbacks();

    printConsole(`${MOD_NAME} initialized.`);
  }

  private AddCallbacks() {
    this.mod.AddCallback(ModCallbacks.MC_POST_PLAYER_INIT, this.PostPlayerInit);
  }

  private PostPlayerInit = (player: EntityPlayer) => {
    switch (player.GetPlayerType()) {
      case PLAYERTYPE_PETER:
        let peter = new Peter(this.mod, player);
        peter.AddCallbacks();
        break;
      case PLAYERTYPE_TAINTEDPETER:
        let taintedPeter = new TaintedPeter(this.mod, player);
        taintedPeter.AddCallbacks();
        break;
    }
  };
}

export function main(): void {
  const mod = new TidesOfFaith();

  mod.Init();
}
