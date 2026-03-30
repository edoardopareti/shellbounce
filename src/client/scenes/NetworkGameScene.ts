import Phaser from 'phaser';
import { InputController } from '../network/InputController';
import { GameClient, type ClientJoinProfile } from '../network/GameClient';
import { ALL_TANK_TYPES, type EffectEvent, type TankType, type WorldSnapshot } from '../../shared/types';
import { RenderTank } from '../render/RenderTank';
import { preloadTankTextures } from '../render/tankVisuals';
import {
  BULLET_RADIUS,
  MUZZLE_OFFSET,
  SHOT_PREVIEW_MAX_DISTANCE,
  SHOT_PREVIEW_REFLECTIONS,
} from '../../shared/constants';
import { predictBulletTrajectory } from '../../shared/shotPrediction';
import { SfxController } from '../audio/SfxController';

const DEFAULT_BACKGROUND = 0x111827;
const MAX_PLAYER_NAME_LENGTH = 24;

const TANK_PREVIEW_COLORS: Record<TankType, string> = {
  PolPot: '#22c55e',
  Hightillery: '#dc2626',
  SSugar: '#f8fafc',
  Fantanyl: '#facc15',
};

export class NetworkGameScene extends Phaser.Scene {
  private readonly client = new GameClient(buildWsUrl());
  private inputController: InputController | undefined;
  private scoreboardToggleKey: Phaser.Input.Keyboard.Key | undefined;
  private wallGraphics: Phaser.GameObjects.Graphics | undefined;
  private dynamicGraphics: Phaser.GameObjects.Graphics | undefined;
  private shotPreviewGraphics: Phaser.GameObjects.Graphics | undefined;
  private scoreboardBackground: Phaser.GameObjects.Rectangle | undefined;
  private scoreboardText: Phaser.GameObjects.Text | undefined;
  private scoreboardVisible = false;
  private sfx: SfxController | undefined;
  private lastRenderedTick = -1;
  private readonly tanks = new Map<string, RenderTank>();

  public constructor() {
    super('network-game');
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(DEFAULT_BACKGROUND);
    this.input.mouse?.disableContextMenu();
    preloadTankTextures(this);

    this.wallGraphics = this.add.graphics();
    this.dynamicGraphics = this.add.graphics();
    this.dynamicGraphics.setDepth(5);
    this.shotPreviewGraphics = this.add.graphics();
    this.shotPreviewGraphics.setDepth(5.4);

    this.sfx = new SfxController();
    showJoinOverlay((joinProfile) => {
      this.inputController = new InputController(this);
      this.scoreboardToggleKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.P, false);
      this.initializeScoreboardUi();
      this.client.connect(joinProfile);
    });
  }

  public update(): void {
    if (this.inputController !== undefined) {
      this.client.sendInput(this.inputController.read());
    }

    const snapshot = this.client.getLatestSnapshot();
    if (snapshot === undefined) {
      return;
    }

    if (snapshot.tick !== this.lastRenderedTick) {
      this.ensureWorldRendered(snapshot);
      this.playEffects(snapshot.effects);
      this.drawDynamic(snapshot);
      this.renderShotPreviews(snapshot);
      this.lastRenderedTick = snapshot.tick;
    }

    if (this.scoreboardToggleKey !== undefined && Phaser.Input.Keyboard.JustDown(this.scoreboardToggleKey)) {
      this.scoreboardVisible = !this.scoreboardVisible;
      this.setScoreboardVisibility(this.scoreboardVisible);
    }

    if (this.scoreboardVisible) {
      this.updateScoreboard(snapshot);
    }

    this.followOwnedPlayer(snapshot);
  }

  private initializeScoreboardUi(): void {
    if (this.scoreboardBackground !== undefined && this.scoreboardText !== undefined) {
      return;
    }

    this.scoreboardBackground = this.add.rectangle(16, 16, 360, 280, 0x020617, 0.5);
    this.scoreboardBackground.setOrigin(0, 0);
    this.scoreboardBackground.setScrollFactor(0);
    this.scoreboardBackground.setDepth(30);

    this.scoreboardText = this.add.text(28, 28, '', {
      color: '#e2e8f0',
      fontSize: '14px',
      fontFamily: 'monospace',
      lineSpacing: 4,
    });
    this.scoreboardText.setScrollFactor(0);
    this.scoreboardText.setDepth(31);

    this.setScoreboardVisibility(false);
  }

  private setScoreboardVisibility(visible: boolean): void {
    this.scoreboardBackground?.setVisible(visible);
    this.scoreboardText?.setVisible(visible);
  }

  private updateScoreboard(snapshot: WorldSnapshot): void {
    if (this.scoreboardBackground === undefined || this.scoreboardText === undefined) {
      return;
    }

    const sortedPlayers = [...snapshot.players].sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.kills !== a.kills) {
        return b.kills - a.kills;
      }
      if (a.deaths !== b.deaths) {
        return a.deaths - b.deaths;
      }
      return a.id.localeCompare(b.id);
    });

    // Format elapsed time as MM:SS
    let elapsed = '';
    if (typeof snapshot.elapsedMs === 'number') {
      const totalSeconds = Math.floor(snapshot.elapsedMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      elapsed = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    const lines = [
      `SCOREBOARD (P)   Time: ${elapsed}`,
      'Name            K   D   S'
    ];

    for (const player of sortedPlayers) {
      const displayName = player.id.length > 14 ? `${player.id.slice(0, 13)}.` : player.id;
      const nameCell = displayName.padEnd(14, ' ');
      const killsCell = String(player.kills).padStart(2, ' ');
      const deathsCell = String(player.deaths).padStart(2, ' ');
      const scoreCell = String(player.score).padStart(3, ' ');
      lines.push(`${nameCell} ${killsCell}  ${deathsCell}  ${scoreCell}`);
    }

    this.scoreboardText.setText(lines);
    const requiredHeight = Math.max(120, 36 + sortedPlayers.length * 22);
    this.scoreboardBackground.setSize(360, requiredHeight);
  }

  private ensureWorldRendered(snapshot: WorldSnapshot): void {
    if (this.wallGraphics === undefined) {
      return;
    }

    if (this.wallGraphics.getData('rendered') === true) {
      return;
    }

    this.wallGraphics.clear();

    this.wallGraphics.fillStyle(0x111827, 1);
    this.wallGraphics.fillRect(0, 0, snapshot.width, snapshot.height);

    this.wallGraphics.lineStyle(1, 0x1f2937, 0.5);
    const spacing = 40;
    for (let x = 0; x <= snapshot.width; x += spacing) {
      this.wallGraphics.beginPath();
      this.wallGraphics.moveTo(x, 0);
      this.wallGraphics.lineTo(x, snapshot.height);
      this.wallGraphics.strokePath();
    }

    for (let y = 0; y <= snapshot.height; y += spacing) {
      this.wallGraphics.beginPath();
      this.wallGraphics.moveTo(0, y);
      this.wallGraphics.lineTo(snapshot.width, y);
      this.wallGraphics.strokePath();
    }

    for (const wall of snapshot.walls) {
      this.wallGraphics.fillStyle(0x334155, 1);
      this.wallGraphics.fillRect(wall.x, wall.y, wall.width, wall.height);
      this.wallGraphics.lineStyle(2, 0x64748b, 0.8);
      this.wallGraphics.strokeRect(wall.x, wall.y, wall.width, wall.height);
    }

    this.cameras.main.setBounds(0, 0, snapshot.width, snapshot.height);
    this.wallGraphics.setData('rendered', true);
  }

  private drawDynamic(snapshot: WorldSnapshot): void {
    if (this.dynamicGraphics === undefined) {
      return;
    }

    this.dynamicGraphics.clear();

    for (const mine of snapshot.mines) {
      this.dynamicGraphics.fillStyle(mine.color, mine.armed ? 1 : 0.95);
      this.dynamicGraphics.fillCircle(mine.x, mine.y, mine.radius);
      this.dynamicGraphics.lineStyle(2, 0x111827, mine.armed ? 1 : 0.8);
      this.dynamicGraphics.strokeCircle(mine.x, mine.y, mine.radius);
    }

    for (const bullet of snapshot.bullets) {
      this.dynamicGraphics.fillStyle(bullet.color, 1);
      this.dynamicGraphics.fillCircle(bullet.x, bullet.y, bullet.radius);
      if (bullet.isCharged) {
        const pulse = 1 + Math.sin(this.time.now * 0.02) * 0.22;
        this.dynamicGraphics.lineStyle(2, 0xfef08a, 0.75);
        this.dynamicGraphics.strokeCircle(bullet.x, bullet.y, (bullet.radius + 3) * pulse);
      }
    }

    this.syncTanks(snapshot);
  }

  private renderShotPreviews(snapshot: WorldSnapshot): void {
    if (this.shotPreviewGraphics === undefined) {
      return;
    }

    this.shotPreviewGraphics.clear();

    for (const player of snapshot.players) {
      if (!player.isAlive) {
        continue;
      }

      const origin = new Phaser.Math.Vector2(
        player.x + Math.cos(player.turretAngle) * MUZZLE_OFFSET,
        player.y + Math.sin(player.turretAngle) * MUZZLE_OFFSET,
      );

      const trajectory = predictBulletTrajectory(
        origin,
        player.turretAngle,
        snapshot.walls,
        BULLET_RADIUS,
        player.isChargingShot ? 0 : SHOT_PREVIEW_REFLECTIONS,
        SHOT_PREVIEW_MAX_DISTANCE,
      );

      for (const segment of trajectory.segments) {
        this.drawDashedLine(segment.start, segment.end, player.bulletColor, 10, 8, 0.8);
      }
    }
  }

  private drawDashedLine(
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    color: number,
    dashLength: number,
    gapLength: number,
    alpha: number,
  ): void {
    if (this.shotPreviewGraphics === undefined) {
      return;
    }

    const totalLength = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
    if (totalLength <= 0.001) {
      return;
    }

    const directionX = (end.x - start.x) / totalLength;
    const directionY = (end.y - start.y) / totalLength;

    let traveled = 0;
    while (traveled < totalLength) {
      const dashStart = traveled;
      const dashEnd = Math.min(traveled + dashLength, totalLength);

      const x1 = start.x + directionX * dashStart;
      const y1 = start.y + directionY * dashStart;
      const x2 = start.x + directionX * dashEnd;
      const y2 = start.y + directionY * dashEnd;

      this.shotPreviewGraphics.lineStyle(2, color, alpha);
      this.shotPreviewGraphics.beginPath();
      this.shotPreviewGraphics.moveTo(x1, y1);
      this.shotPreviewGraphics.lineTo(x2, y2);
      this.shotPreviewGraphics.strokePath();

      traveled += dashLength + gapLength;
    }
  }

  private playEffects(effects: EffectEvent[]): void {
    for (const effect of effects) {
      if (effect.kind === 'bullet-shot') {
        this.sfx?.playBulletShot();
      } else if (effect.kind === 'mine-place') {
        this.sfx?.playMinePlace();
      } else if (effect.kind === 'bullet-explosion') {
        this.sfx?.playBulletExplosion();
        this.playExplosionEffect(effect);
      } else if (effect.kind === 'mine-explosion') {
        this.sfx?.playMineExplosion();
        this.playExplosionEffect(effect);
      } else if (effect.kind === 'explosion') {
        this.playExplosionEffect(effect);
      } else {
        this.sfx?.playTankDestroyed();
        this.playTankDestructionEffect(effect);
      }
    }
  }

  private playExplosionEffect(effect: EffectEvent): void {
    const wave = this.add.circle(effect.x, effect.y, 8, effect.color, 0.45);
    wave.setDepth(6);

    this.tweens.add({
      targets: wave,
      radius: effect.radius,
      alpha: 0,
      duration: effect.durationMs,
      ease: 'Cubic.Out',
      onComplete: () => wave.destroy(),
    });
  }

  private playTankDestructionEffect(effect: EffectEvent): void {
    const flash = this.add.circle(effect.x, effect.y, 14, effect.color, 0.95);
    flash.setDepth(7);
    flash.setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: flash,
      scaleX: 2.8,
      scaleY: 2.8,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.Out',
      onComplete: () => flash.destroy(),
    });

    const shockwave = this.add.circle(effect.x, effect.y, 18, effect.color, 0);
    shockwave.setDepth(6.8);
    shockwave.setStrokeStyle(4, effect.color, 0.7);

    this.tweens.add({
      targets: shockwave,
      scaleX: 2.6,
      scaleY: 2.6,
      alpha: 0,
      duration: 300,
      ease: 'Quad.Out',
      onComplete: () => shockwave.destroy(),
    });

    for (let i = 0; i < 200; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(36, 112);
      const size = Phaser.Math.Between(3, 7);
      const shard = this.add.rectangle(effect.x, effect.y, size, size * 1.8, effect.color, 0.95);
      shard.setDepth(6.9);
      shard.setRotation(angle);

      this.tweens.add({
        targets: shard,
        x: effect.x + Math.cos(angle) * distance,
        y: effect.y + Math.sin(angle) * distance,
        angle: Phaser.Math.Between(-270, 270),
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: Phaser.Math.Between(240, 430),
        ease: 'Cubic.Out',
        onComplete: () => shard.destroy(),
      });
    }

    const scorch = this.add.ellipse(effect.x, effect.y + 10, 30, 16, 0x020617, 0.5);
    scorch.setDepth(1.5);
    this.tweens.add({
      targets: scorch,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.15,
      duration: 650,
      ease: 'Quad.Out',
      onComplete: () => scorch.destroy(),
    });

    this.cameras.main.shake(90, 0.005, true);
  }

  private syncTanks(snapshot: WorldSnapshot): void {
    const aliveIds = new Set(snapshot.players.map((player) => player.id));

    for (const [playerId, tank] of this.tanks.entries()) {
      if (aliveIds.has(playerId)) {
        continue;
      }

      tank.destroy();
      this.tanks.delete(playerId);
    }

    for (const player of snapshot.players) {
      let renderTank = this.tanks.get(player.id);
      if (renderTank === undefined) {
        renderTank = new RenderTank(this, player);
        this.tanks.set(player.id, renderTank);
      }

      renderTank.sync(player);
    }
  }

  private followOwnedPlayer(snapshot: WorldSnapshot): void {
    const youId = this.client.getPlayerId();
    if (youId === undefined) {
      return;
    }

    const ownPlayer = snapshot.players.find((player) => player.id === youId);
    if (ownPlayer === undefined) {
      return;
    }

    this.cameras.main.centerOn(ownPlayer.x, ownPlayer.y);
  }

}

function showJoinOverlay(onSubmit: (joinProfile: ClientJoinProfile) => void): void {
  const appHost = document.getElementById('app') ?? document.body;
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.display = 'grid';
  overlay.style.placeItems = 'center';
  overlay.style.background = 'rgba(2, 6, 23, 0.7)';
  overlay.style.backdropFilter = 'blur(4px)';
  overlay.style.zIndex = '9999';

  const panel = document.createElement('form');
  panel.style.width = 'min(92vw, 420px)';
  panel.style.background = '#0f172a';
  panel.style.border = '1px solid #334155';
  panel.style.borderRadius = '14px';
  panel.style.padding = '20px';
  panel.style.display = 'grid';
  panel.style.gap = '12px';
  panel.style.color = '#e2e8f0';
  panel.style.fontFamily = 'monospace';

  const title = document.createElement('h2');
  title.textContent = 'Join Arena';
  title.style.margin = '0';
  title.style.fontSize = '20px';

  const controlsTitle = document.createElement('div');
  controlsTitle.textContent = 'Controls';
  controlsTitle.style.fontSize = '13px';
  controlsTitle.style.fontWeight = '700';
  controlsTitle.style.marginTop = '2px';

  const controlsList = document.createElement('div');
  controlsList.style.fontSize = '12px';
  controlsList.style.lineHeight = '1.45';
  controlsList.style.border = '1px solid #334155';
  controlsList.style.borderRadius = '10px';
  controlsList.style.padding = '8px 10px';
  controlsList.style.background = '#111827';
  controlsList.style.whiteSpace = 'pre-line';
  controlsList.textContent = [
    'Move/Rotate: WASD',
    'Aim: Mouse',
    'Normal Shot: Left Click',
    'Charged Shot: Left Click (hold)',
    'Detonate Shot: Right Click',
    'Place Mine: Middle Click or E',
    'Shield: Left+Right Click (hold)',
    'Boost: SPACE',
    'Scoreboard: P (toggle)',
  ].join('\n');

  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Player Name';
  nameLabel.htmlFor = 'join-player-name';
  nameLabel.style.fontSize = '13px';

  const nameInput = document.createElement('input');
  nameInput.id = 'join-player-name';
  nameInput.type = 'text';
  nameInput.maxLength = MAX_PLAYER_NAME_LENGTH;
  nameInput.placeholder = 'max 24 chars';
  nameInput.autocomplete = 'off';
  nameInput.style.height = '36px';
  nameInput.style.borderRadius = '8px';
  nameInput.style.border = '1px solid #475569';
  nameInput.style.background = '#020617';
  nameInput.style.color = '#e2e8f0';
  nameInput.style.padding = '0 10px';

  const tankLabel = document.createElement('label');
  tankLabel.textContent = 'Tank Type';
  tankLabel.htmlFor = 'join-tank-type';
  tankLabel.style.fontSize = '13px';

  const tankSelect = document.createElement('select');
  tankSelect.id = 'join-tank-type';
  tankSelect.style.height = '36px';
  tankSelect.style.borderRadius = '8px';
  tankSelect.style.border = '1px solid #475569';
  tankSelect.style.background = '#020617';
  tankSelect.style.color = '#e2e8f0';
  tankSelect.style.padding = '0 10px';

  for (const tankType of ALL_TANK_TYPES) {
    const option = document.createElement('option');
    option.value = tankType;
    option.textContent = tankType;
    tankSelect.appendChild(option);
  }

  const previewContainer = document.createElement('div');
  previewContainer.style.display = 'flex';
  previewContainer.style.alignItems = 'center';
  previewContainer.style.gap = '10px';
  previewContainer.style.padding = '8px 10px';
  previewContainer.style.borderRadius = '10px';
  previewContainer.style.background = '#111827';
  previewContainer.style.border = '1px solid #334155';

  const colorSwatch = document.createElement('span');
  colorSwatch.style.width = '16px';
  colorSwatch.style.height = '16px';
  colorSwatch.style.borderRadius = '999px';
  colorSwatch.style.border = '1px solid #94a3b8';

  const previewText = document.createElement('span');
  previewText.style.fontSize = '13px';

  previewContainer.appendChild(colorSwatch);
  previewContainer.appendChild(previewText);

  const errorText = document.createElement('div');
  errorText.style.minHeight = '18px';
  errorText.style.color = '#fca5a5';
  errorText.style.fontSize = '12px';

  const confirmButton = document.createElement('button');
  confirmButton.type = 'submit';
  confirmButton.textContent = 'Join Battle';
  confirmButton.style.height = '38px';
  confirmButton.style.border = 'none';
  confirmButton.style.borderRadius = '8px';
  confirmButton.style.background = '#22c55e';
  confirmButton.style.color = '#052e16';
  confirmButton.style.fontWeight = '700';
  confirmButton.style.cursor = 'pointer';

  const updatePreview = (): void => {
    const playerName = nameInput.value.trim();
    const tankType = tankSelect.value as TankType;
    const color = TANK_PREVIEW_COLORS[tankType] ?? '#94a3b8';

    colorSwatch.style.backgroundColor = color;
    previewText.textContent = `${playerName.length > 0 ? playerName : 'YourName'} -> ${tankType}`;
  };

  panel.appendChild(title);
  panel.appendChild(controlsTitle);
  panel.appendChild(controlsList);
  panel.appendChild(nameLabel);
  panel.appendChild(nameInput);
  panel.appendChild(tankLabel);
  panel.appendChild(tankSelect);
  panel.appendChild(previewContainer);
  panel.appendChild(errorText);
  panel.appendChild(confirmButton);
  overlay.appendChild(panel);
  appHost.appendChild(overlay);

  nameInput.addEventListener('input', updatePreview);
  tankSelect.addEventListener('change', updatePreview);

  panel.addEventListener('submit', (event) => {
    event.preventDefault();

    const playerId = nameInput.value.trim();
    const selectedTankType = tankSelect.value;

    if (playerId.length === 0) {
      errorText.textContent = 'Player name cannot be empty.';
      return;
    }

    if (playerId.length > MAX_PLAYER_NAME_LENGTH) {
      errorText.textContent = `Player name must be ${MAX_PLAYER_NAME_LENGTH} characters or fewer.`;
      return;
    }

    if (!isTankType(selectedTankType)) {
      errorText.textContent = 'Please choose a valid tank type.';
      return;
    }

    overlay.remove();
    onSubmit({
      playerId,
      tankType: selectedTankType,
    });
  });

  updatePreview();
  nameInput.focus();
}

function isTankType(value: string): value is TankType {
  return ALL_TANK_TYPES.some((tankType) => tankType === value);
}

function buildWsUrl(): string {
  const configuredUrl = import.meta.env.VITE_SERVER_WS_URL as string | undefined;
  if (configuredUrl !== undefined && configuredUrl.length > 0) {
    return configuredUrl;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host; // includes hostname and port
  return `${protocol}://${host}/ws`;
}
