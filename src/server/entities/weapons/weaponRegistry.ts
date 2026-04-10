import type { WeaponSetupInput, WeaponType } from '../../../shared/types.js';
import type { Weapon, WeaponRuntime } from './weapon.js';

export type WeaponFactory = (runtime: WeaponRuntime, weaponSetup?: WeaponSetupInput) => Weapon;

export class WeaponRegistry {
  // This class manages the registration and creation of weapon instances based on tank types.

  // A map that associates each WeaponType with a corresponding WeaponFactory function.
  private readonly factories = new Map<WeaponType, WeaponFactory>();
  // A default WeaponFactory to be used when no specific factory is registered for a given TankType.
  private defaultFactory: WeaponFactory | undefined;

  public register(weaponType: WeaponType, factory: WeaponFactory): void {
    // Register a weapon factory for a specific weapon type.
    this.factories.set(weaponType, factory);
  }

  public registerDefault(factory: WeaponFactory): void {
    // Register a default weapon factory
    // to be used when no specific factory is found for a tank type.
    this.defaultFactory = factory;
  }

  public createForWeaponType(
    weaponType: WeaponType,
    runtime: WeaponRuntime,
    weaponSetup?: WeaponSetupInput,
  ): Weapon {
    // Create a weapon instance for the given weapon type using the registered factory.
    // Look up the factory for the specified weapon type. If not found, use the default factory.
    const factory = this.factories.get(weaponType) ?? this.defaultFactory;
    if (factory === undefined) {
      throw new Error(`No weapon factory registered for weapon type: ${weaponType}`);
    }

    return factory(runtime, weaponSetup);
  }
}
