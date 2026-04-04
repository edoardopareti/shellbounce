import type { PlayerEntity } from './player.js';

export function registerFrag(
  victim: Pick<PlayerEntity, 'id' | 'deaths'>,
  killerId: string | undefined,
  players: ReadonlyMap<string, Pick<PlayerEntity, 'id' | 'kills'>>,
): void {
  victim.deaths += 1;

  if (killerId === undefined || killerId === victim.id) {
    return;
  }

  const killer = players.get(killerId);
  if (killer !== undefined) {
    killer.kills += 1;
  }
}
