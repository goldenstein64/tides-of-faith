import Mod from "./Mod";
import { clamp } from "./util";

const SOUL_SPEED = 8;

export default class SoulCharger {
  private soulEffects = new Set<int>();

  constructor(
    private mod: Mod,
    private owner: EntityPlayer,
    private maxCharge: int,
  ) {}

  Load(): void {
    this.AddCallbacks();
  }

  Unload(): void {
    this.RemoveCallbacks();
  }

  private AddCallbacks(): void {
    Mod.AddCallback(ModCallbacks.MC_POST_NPC_DEATH, this.PostNpcDeath);

    Mod.AddCallback(
      ModCallbacks.MC_POST_EFFECT_UPDATE,
      this.PostEffectUpdate,
      EffectVariant.ENEMY_SOUL,
    );
  }

  private RemoveCallbacks(): void {
    Mod.RemoveCallback(ModCallbacks.MC_POST_NPC_DEATH, this.PostNpcDeath);

    Mod.RemoveCallback(
      ModCallbacks.MC_POST_EFFECT_UPDATE,
      this.PostEffectUpdate,
    );
  }

  PostNpcDeath = (enemy: EntityNPC): void => {
    if (!enemy.IsActiveEnemy(true)) return;

    let effect = Isaac.Spawn(
      EntityType.ENTITY_EFFECT,
      EffectVariant.ENEMY_SOUL,
      0,
      enemy.Position,
      Vector.Zero,
      this.owner,
    ).ToEffect()!;

    this.soulEffects.add(effect.Index);
  };

  PostEffectUpdate = (effect: EntityEffect): void => {
    if (!this.soulEffects.has(effect.Index)) return;

    if (!effect.Exists()) {
      this.soulEffects.delete(effect.Index);
      return;
    }

    let direction = this.owner.Position.sub(effect.Position).Normalized();

    effect.Velocity = direction.mul(SOUL_SPEED);
    if (effect.Position.DistanceSquared(this.owner.Position) < 400) {
      effect.Remove();
      Isaac.Spawn(
        EntityType.ENTITY_EFFECT,
        EffectVariant.COIN_PARTICLE,
        0,
        this.owner.Position,
        Vector.Zero,
        effect,
      );
      this.addCharge(1);
    }
  };

  private getCharge(): int {
    return this.owner.GetActiveCharge(ActiveSlot.SLOT_PRIMARY);
  }

  private addCharge(charge: number): void {
    let newCharge = clamp(this.getCharge() + charge, 0, this.maxCharge);
    this.owner.SetActiveCharge(newCharge, ActiveSlot.SLOT_PRIMARY);
  }
}
