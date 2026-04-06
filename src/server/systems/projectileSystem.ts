import {
  FIXED_TIMESTEP_SECONDS,
} from '../../shared/constants.js';
import { distance } from '../../shared/math.js';
import { DEFAULT_BULLET_RADIUS, type BulletEntity } from '../entities/bullet.js';
import type { MineEntity } from '../entities/mine.js';
import type { PlayerEntity } from '../entities/player.js';

export interface ProjectileUpdateHandlers {
  explodeBullet: (index: number) => void;
}

export interface ProjectileImpactHandlers {
  explodeBullet: (index: number) => void;
  explodeMine: (x: number, y: number, sourcePlayerId?: string) => void;
  isBulletHittingShield: (bullet: BulletEntity, player: PlayerEntity) => boolean;
  deflectBulletByShieldSurfaceNormal: (bullet: BulletEntity, player: PlayerEntity) => void;
  destroyPlayer: (player: PlayerEntity, killerPlayerId?: string) => void;
}

export class ProjectileSystem {
  public updateBullets(
    bullets: BulletEntity[],
    intersectsAnyWall: (x: number, y: number, radius: number) => boolean,
    handlers: ProjectileUpdateHandlers,
  ): void {
    const deltaMs = FIXED_TIMESTEP_SECONDS * 1000;

    for (let index = bullets.length - 1; index >= 0; index -= 1) {
      const bullet = bullets[index];
      if (bullet === undefined) {
        continue;
      }

      bullet.lifetimeMs += deltaMs;
      if (bullet.lifetimeMs >= bullet.maxLifetimeMs) {
        bullets.splice(index, 1);
        continue;
      }

      const nextX = bullet.x + bullet.vx * FIXED_TIMESTEP_SECONDS;
      const nextY = bullet.y + bullet.vy * FIXED_TIMESTEP_SECONDS;

      let bounced = false;
      if (intersectsAnyWall(nextX, bullet.y, bullet.radius)) {
        if (bullet.explodeOnWallImpact) {
          handlers.explodeBullet(index);
          continue;
        }
        bullet.vx *= -1;
        bounced = true;
      } else {
        bullet.x = nextX;
      }

      if (index >= bullets.length) {
        continue;
      }

      if (intersectsAnyWall(bullet.x, nextY, bullet.radius)) {
        if (bullet.explodeOnWallImpact) {
          handlers.explodeBullet(index);
          continue;
        }
        bullet.vy *= -1;
        bounced = true;
      } else {
        bullet.y = nextY;
      }

      if (bounced) {
        bullet.bouncesRemaining -= 1;
        if (bullet.bouncesRemaining < 0) {
          bullets.splice(index, 1);
        }
      }
    }
  }

  public resolveBulletBulletCollisions(bullets: BulletEntity[], handlers: ProjectileUpdateHandlers): void {
    for (let i = 0; i < bullets.length; i += 1) {
      const first = bullets[i];
      if (first === undefined) {
        continue;
      }

      for (let j = i + 1; j < bullets.length; j += 1) {
        const second = bullets[j];
        if (second === undefined) {
          continue;
        }

        if (first.ownerPlayerId === second.ownerPlayerId) {
          continue;
        }

        const hitDistance = first.radius + second.radius;
        if (distance(first.x, first.y, second.x, second.y) > hitDistance) {
          continue;
        }

        const firstIndex = bullets.indexOf(first);
        if (firstIndex >= 0) {
          handlers.explodeBullet(firstIndex);
        }

        const secondIndex = bullets.indexOf(second);
        if (secondIndex >= 0) {
          handlers.explodeBullet(secondIndex);
        }

        break;
      }
    }
  }

  public resolveBulletImpacts(
    bullets: BulletEntity[],
    mines: MineEntity[],
    players: ReadonlyMap<string, PlayerEntity>,
    handlers: ProjectileImpactHandlers,
  ): void {
    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      if (bulletIndex >= bullets.length) {
        continue;
      }

      const bullet = bullets[bulletIndex];
      if (bullet === undefined) {
        continue;
      }

      let handled = false;

      for (let mineIndex = mines.length - 1; mineIndex >= 0; mineIndex -= 1) {
        const mine = mines[mineIndex];
        if (mine === undefined) {
          continue;
        }
        if (distance(bullet.x, bullet.y, mine.x, mine.y) > bullet.radius + mine.radius) {
          continue;
        }

        mines.splice(mineIndex, 1);
        handlers.explodeMine(mine.x, mine.y, mine.ownerPlayerId);
        bullets.splice(bulletIndex, 1);
        handled = true;
        break;
      }

      if (handled || bulletIndex >= bullets.length) {
        continue;
      }

      for (const player of players.values()) {
        if (!player.isAlive) {
          continue;
        }

        if (handlers.isBulletHittingShield(bullet, player)) {
          handlers.deflectBulletByShieldSurfaceNormal(bullet, player);
          handled = true;
          break;
        }

        if (distance(player.x, player.y, bullet.x, bullet.y) > player.radius + bullet.radius) {
          continue;
        }

        handlers.explodeBullet(bulletIndex);
        handlers.destroyPlayer(player, bullet.ownerPlayerId);
        handled = true;
        break;
      }

      if (handled) {
        continue;
      }
    }
  }

  public isLineOfFireThreatened(
    bulletOriginX: number,
    bulletOriginY: number,
    targetX: number,
    targetY: number,
    margin: number,
  ): boolean {
    return distance(bulletOriginX, bulletOriginY, targetX, targetY) <= DEFAULT_BULLET_RADIUS + margin;
  }
}
