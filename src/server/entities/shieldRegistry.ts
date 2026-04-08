import type { Shield } from './shield.js';

export type ShieldFactory = () => Shield;

export class ShieldRegistry {
  private defaultFactory: ShieldFactory | undefined;

  public registerDefault(factory: ShieldFactory): void {
    this.defaultFactory = factory;
  }

  public createDefault(): Shield {
    if (this.defaultFactory === undefined) {
      throw new Error('No default shield factory registered.');
    }

    return this.defaultFactory();
  }
}
