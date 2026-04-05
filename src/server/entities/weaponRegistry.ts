import type { TankType } from '../../shared/types.js';
import type { Weapon } from './weapon.js';

// WeaponRuntime provides the necessary functions and data
// for weapon instances to interact with the simulation
export interface WeaponRuntime {
  nextBulletId: () => string;
  detonateOldestBulletForPlayer: (playerId: string) => void;
}

export type WeaponFactory = (runtime: WeaponRuntime) => Weapon;

export class WeaponRegistry {
  // This class manages the registration and creation of weapon instances based on tank types.

  // A map that associates each TankType with a corresponding WeaponFactory function.
  private readonly factories = new Map<TankType, WeaponFactory>();
  // A default WeaponFactory to be used when no specific factory is registered for a given TankType.
  private defaultFactory: WeaponFactory | undefined;

  public register(tankType: TankType, factory: WeaponFactory): void {
    // Register a weapon factory for a specific tank type.
    this.factories.set(tankType, factory);
  }

  public registerDefault(factory: WeaponFactory): void {
    // Register a default weapon factory
    // to be used when no specific factory is found for a tank type.
    this.defaultFactory = factory;
  }

  public createForTankType(tankType: TankType, runtime: WeaponRuntime): Weapon {
    // Create a weapon instance for the given tank type using the registered factory.
    // Look up the factory for the specified tank type. If not found, use the default factory.
    const factory = this.factories.get(tankType) ?? this.defaultFactory;
    if (factory === undefined) {
      throw new Error(`No weapon factory registered for tank type: ${tankType}`);
    }

    return factory(runtime);
  }
}
