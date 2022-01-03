const SOUL_SPEED = 8;

export default class SoulCharger {
  private soulEffects: Set<int> = new Set();

  constructor(
    private soulChargedItemMod: Mod,
    private soulChargedItemOwner: EntityPlayer,
    private maxCharge: int,
  ) {}

  AddCallbacks() {
    this.soulChargedItemMod.AddCallback(
      ModCallbacks.MC_POST_NPC_DEATH,
      this.PostNpcDeath,
    );

    this.soulChargedItemMod.AddCallback(
      ModCallbacks.MC_POST_EFFECT_UPDATE,
      this.PostEffectUpdate,
      EffectVariant.ENEMY_SOUL,
    );
  }

  PostNpcDeath = (enemy: EntityNPC) => {
    if (!enemy.IsActiveEnemy(true)) return;

    let effect = Isaac.Spawn(
      EntityType.ENTITY_EFFECT,
      EffectVariant.ENEMY_SOUL,
      0,
      enemy.Position,
      Vector.Zero,
      this.soulChargedItemOwner,
    ).ToEffect()!;

    this.soulEffects.add(effect.Index);
  };

  PostEffectUpdate = (effect: EntityEffect) => {
    if (!this.soulEffects.has(effect.Index)) return;

    if (!effect.Exists()) {
      this.soulEffects.delete(effect.Index);
      return;
    }

    let direction = this.soulChargedItemOwner.Position.sub(
      effect.Position,
    ).Normalized();

    effect.Velocity = direction.mul(SOUL_SPEED);
    if (
      effect.Position.DistanceSquared(this.soulChargedItemOwner.Position) < 400
    ) {
      effect.Remove();
      Isaac.Spawn(
        EntityType.ENTITY_EFFECT,
        EffectVariant.COIN_PARTICLE,
        0,
        this.soulChargedItemOwner.Position,
        Vector.Zero,
        effect,
      );
      this.addCharge(1);
    }
  };

  private getCharge() {
    return this.soulChargedItemOwner.GetActiveCharge(ActiveSlot.SLOT_PRIMARY);
  }

  private addCharge(charge: number) {
    let newCharge = Math.min(this.getCharge() + charge, this.maxCharge);
    this.soulChargedItemOwner.SetActiveCharge(
      newCharge,
      ActiveSlot.SLOT_PRIMARY,
    );
  }
}
