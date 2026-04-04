// src/client/audio/SfxController.ts

// This file defines the SfxController class, which manages sound effects for the game.
// It uses the Web Audio API to generate procedural sound effects for various in-game events,
// such as shooting, explosions, and tank destruction.

type WebAudioContext = AudioContext;

export class SfxController {

  // The SfxController class is responsible for managing sound effects in the game.
  // It uses the Web Audio API to generate procedural sound effects for various in-game events,
  // such as shooting, explosions, and tank destruction.

  private readonly context: WebAudioContext | undefined;

  public constructor() {
    this.context = this.resolveContext();
  }

  public playBulletShot(): void {
    
    // This method plays the sound effect for shooting a bullet, which consists of a noise burst
    // followed by a frequency sweep to create a satisfying shooting sound.

    this.playSweep({
      startFrequency: 760,
      endFrequency: 420,
      durationSec: 0.08,
      volume: 0.07,
      type: 'square',
    });
  }

  public playBulletExplosion(): void {
    this.playNoiseBurst(0.18, 0.1, 2400);
    this.playSweep({
      startFrequency: 220,
      endFrequency: 110,
      durationSec: 0.18,
      volume: 0.06,
      type: 'triangle',
    }); 
  }

  public playMinePlace(): void {
    this.playSweep({
      startFrequency: 360,
      endFrequency: 460,
      durationSec: 0.09,
      volume: 0.06,
      type: 'sine',
    });
  }

  public playMineExplosion(): void {
    this.playNoiseBurst(0.28, 0.14, 1800);
    this.playSweep({
      startFrequency: 160,
      endFrequency: 70,
      durationSec: 0.26,
      volume: 0.09,
      type: 'sawtooth',
    });
  }

  public playTankDestroyed(): void {
    this.playNoiseBurst(0.24, 0.11, 2200);
    this.playSweep({
      startFrequency: 210,
      endFrequency: 55,
      durationSec: 0.32,
      volume: 0.09,
      type: 'triangle',
    });
  }

  private resolveContext(): WebAudioContext | undefined {
    const globalAudioContext = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (globalAudioContext === undefined) {
      return undefined;
    }

    try {
      return new globalAudioContext();
    } catch {
      return undefined;
    }
  }

  private playSweep(config: {
    startFrequency: number;
    endFrequency: number;
    durationSec: number;
    volume: number;
    type: OscillatorType;
  }): void {
    if (this.context === undefined) {
      return;
    }

    const ctx = this.context;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, config.endFrequency), now + config.durationSec);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(config.volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + config.durationSec);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + config.durationSec + 0.02);
  }

  private playNoiseBurst(durationSec: number, volume: number, lowpassFrequency: number): void {
    if (this.context === undefined) {
      return;
    }

    const ctx = this.context;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const frameCount = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < frameCount; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpassFrequency;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(now);
    source.stop(now + durationSec + 0.02);
  }
}
