import type { TankType } from '../../shared/types.js';
import type { Weapon } from './weapon.js';

export interface WeaponRuntime {
  nextBulletId: () => string;
  detonateOldestBulletForPlayer: (playerId: string) => void;
}

export type WeaponFactory = (runtime: WeaponRuntime) => Weapon;

export class WeaponRegistry {
  private readonly factories = new Map<TankType, WeaponFactory>();
  private defaultFactory: WeaponFactory | undefined;

  public register(tankType: TankType, factory: WeaponFactory): void {
    this.factories.set(tankType, factory);
  }

  public registerDefault(factory: WeaponFactory): void {
    this.defaultFactory = factory;
  }

  public createForTankType(tankType: TankType, runtime: WeaponRuntime): Weapon {
    const factory = this.factories.get(tankType) ?? this.defaultFactory;
    if (factory === undefined) {
      throw new Error(`No weapon factory registered for tank type: ${tankType}`);
    }

    return factory(runtime);
  }
}
