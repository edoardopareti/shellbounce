import type { EffectEvent } from '../../shared/types.js';

export class EffectBuffer {
  private readonly effects: EffectEvent[] = [];
  private nextEffectId = 0;

  public pushExplosion(
    kind: 'explosion' | 'bullet-explosion' | 'mine-explosion',
    x: number,
    y: number,
    radius: number,
    color: number,
    durationMs: number,
  ): void {
    this.effects.push({
      id: `fx-${this.nextEffectId++}`,
      kind,
      x,
      y,
      radius,
      color,
      durationMs,
    });
  }

  public pushTankDestruction(x: number, y: number, color: number): void {
    this.effects.push({
      id: `fx-${this.nextEffectId++}`,
      kind: 'tank-destruction',
      x,
      y,
      radius: 48,
      color,
      durationMs: 430,
    });
  }

  public pushTransient(
    kind: 'bullet-shot' | 'mine-place' | 'boost',
    x: number,
    y: number,
    radius: number,
    color: number,
    durationMs: number,
    angle?: number,
  ): void {
    // Push a transient effect (like a bullet shot, mine placement, or boost activation) to the buffer.
    // This effect will be rendered briefly on the client side to provide visual feedback
    // for the corresponding action.
    this.effects.push({
      id: `fx-${this.nextEffectId++}`,
      kind,
      x,
      y,
      radius,
      color,
      durationMs,
      angle,
    });
  }

  public drain(): EffectEvent[] {
    const drained = [...this.effects];
    this.effects.length = 0;
    return drained;
  }
}
