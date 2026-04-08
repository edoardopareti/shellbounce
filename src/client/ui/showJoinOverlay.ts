import type { ClientJoinProfile } from '../network/GameClient';
import {
  ALL_TANK_TYPES,
  ALL_WEAPON_TYPES,
  DEFAULT_WEAPON_BY_TANK,
  type TankType,
  type WeaponType,
} from '../../shared/types';
import { isTankType, isWeaponType } from '../utils/utils';

const MAX_PLAYER_NAME_LENGTH = 24;

const TANK_PREVIEW_COLORS: Record<TankType, string> = {
  PolPot: '#22c55e',
  Hightillery: '#dc2626',
  SSugar: '#f8fafc',
  Fantanyl: '#facc15',
};

export function showJoinOverlay(onSubmit: (joinProfile: ClientJoinProfile) => void): void {
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
    'Surprise!: Right Click',
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

  const weaponLabel = document.createElement('label');
  weaponLabel.textContent = 'Weapon';
  weaponLabel.htmlFor = 'join-weapon-type';
  weaponLabel.style.fontSize = '13px';

  const weaponSelect = document.createElement('select');
  weaponSelect.id = 'join-weapon-type';
  weaponSelect.style.height = '36px';
  weaponSelect.style.borderRadius = '8px';
  weaponSelect.style.border = '1px solid #475569';
  weaponSelect.style.background = '#020617';
  weaponSelect.style.color = '#e2e8f0';
  weaponSelect.style.padding = '0 10px';

  for (const weaponType of ALL_WEAPON_TYPES) {
    const option = document.createElement('option');
    option.value = weaponType;
    option.textContent = weaponType;
    weaponSelect.appendChild(option);
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

  panel.appendChild(title);
  panel.appendChild(controlsTitle);
  panel.appendChild(controlsList);
  panel.appendChild(nameLabel);
  panel.appendChild(nameInput);
  panel.appendChild(tankLabel);
  panel.appendChild(tankSelect);
  panel.appendChild(weaponLabel);
  panel.appendChild(weaponSelect);
  panel.appendChild(previewContainer);
  panel.appendChild(errorText);
  panel.appendChild(confirmButton);

  overlay.appendChild(panel);
  appHost.appendChild(overlay);

  const updatePreview = (): void => {
    const playerName = nameInput.value.trim();
    const tankType = tankSelect.value as TankType;
    const weaponType = weaponSelect.value as WeaponType;
    const color = TANK_PREVIEW_COLORS[tankType] ?? '#94a3b8';

    colorSwatch.style.backgroundColor = color;
    previewText.textContent = `${playerName.length > 0 ? playerName : 'YourName'} -> ${tankType} / ${weaponType}`;
  };

  nameInput.addEventListener('input', updatePreview);
  tankSelect.addEventListener('change', () => {
    const selectedTankType = tankSelect.value as TankType;
    weaponSelect.value = DEFAULT_WEAPON_BY_TANK[selectedTankType];
    updatePreview();
  });
  weaponSelect.addEventListener('change', updatePreview);

  panel.addEventListener('submit', (event) => {
    event.preventDefault();

    const playerId = nameInput.value.trim();
    const selectedTankType = tankSelect.value;
    const selectedWeaponType = weaponSelect.value;

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
    if (!isWeaponType(selectedWeaponType)) {
      errorText.textContent = 'Please choose a valid weapon.';
      return;
    }

    overlay.remove();
    onSubmit({
      playerId,
      tankType: selectedTankType,
      weaponType: selectedWeaponType,
    });
  });

  weaponSelect.value = DEFAULT_WEAPON_BY_TANK[tankSelect.value as TankType];
  updatePreview();
  nameInput.focus();
}
