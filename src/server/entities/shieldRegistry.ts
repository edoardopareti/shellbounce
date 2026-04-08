import type { ShieldType } from '../../shared/types.js';
import type { Shield } from './shield.js';

export type ShieldFactory = () => Shield;

export class ShieldRegistry {
  private readonly factories = new Map<ShieldType, ShieldFactory>();
  private defaultFactory: ShieldFactory | undefined;

  public register(shieldType: ShieldType, factory: ShieldFactory): void {
    this.factories.set(shieldType, factory);
  }

  public registerDefault(factory: ShieldFactory): void {
    this.defaultFactory = factory;
  }

  public createForShieldType(shieldType: ShieldType): Shield {
    const factory = this.factories.get(shieldType) ?? this.defaultFactory;
    if (factory === undefined) {
      throw new Error(`No shield factory registered for shield type: ${shieldType}`);
    }

    return factory();
  }

  public createDefault(): Shield {
    if (this.defaultFactory === undefined) {
      throw new Error('No default shield factory registered.');
    }

    return this.defaultFactory();
  }
}
