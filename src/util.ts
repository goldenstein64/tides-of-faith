export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getActiveEnemies(): EntityNPC[] {
  let result: EntityNPC[] = [];
  for (let entity of Isaac.GetRoomEntities()) {
    let npc = entity.ToNPC();

    if (!npc || !npc.IsActiveEnemy(false)) continue;

    result.push(npc);
  }

  return result;
}
