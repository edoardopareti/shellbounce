import type { Mine } from './mine.js';

export type MineFactory = () => Mine;

export class MineRegistry {
  private defaultFactory: MineFactory | undefined;

  public registerDefault(factory: MineFactory): void {
    this.defaultFactory = factory;
  }

  public createDefault(): Mine {
    if (this.defaultFactory === undefined) {
      throw new Error('No default mine factory registered.');
    }

    return this.defaultFactory();
  }
}
