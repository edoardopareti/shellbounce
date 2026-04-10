import type { ClientJoinProfile } from '../network/GameClient';
import {
  ALL_SHIELD_TYPES,
  ALL_TANK_TYPES,
  ALL_WEAPON_TYPES,
  DEFAULT_SHIELD_BY_TANK,
  DEFAULT_WEAPON_BY_TANK,
  type ShieldType,
  type TankSetupInput,
  type TankType,
  type WeaponSetupInput,
  type WeaponSetupInputByWeaponType,
  type WeaponType,
} from '../../shared/types';
import { isShieldType, isTankType, isWeaponType } from '../utils/utils';
import { showTankConfigWizard } from './showTankConfigWizard';
import { showWeaponConfigWizard } from './showWeaponConfigWizard';
import { DEFAULT_TANK_SETUP_BY_TANK, DEFAULT_WEAPON_SETUP_BY_WEAPON } from '../../shared/constants';

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

  const tankLabelRow = document.createElement('div');
  tankLabelRow.style.display = 'flex';
  tankLabelRow.style.alignItems = 'center';
  tankLabelRow.style.justifyContent = 'space-between';

  const tankSetupButton = document.createElement('button');
  tankSetupButton.type = 'button';
  tankSetupButton.textContent = '⚙';
  tankSetupButton.title = 'Tank Setup';
  tankSetupButton.setAttribute('aria-label', 'Open tank setup wizard');
  tankSetupButton.style.width = '28px';
  tankSetupButton.style.height = '28px';
  tankSetupButton.style.borderRadius = '8px';
  tankSetupButton.style.border = '1px solid #475569';
  tankSetupButton.style.background = '#0b1221';
  tankSetupButton.style.color = '#bfdbfe';
  tankSetupButton.style.cursor = 'pointer';
  tankSetupButton.style.fontSize = '16px';

  tankLabelRow.appendChild(tankLabel);
  tankLabelRow.appendChild(tankSetupButton);


  // Tooltip descriptions for tanks and weapons
  const TANK_TYPE_TOOLTIPS: Record<string, string> = {
    PolPot: 'Balanced.', //'Relaxed and laid back, just like the creator of this game would like to be.',
    Hightillery: 'Aggressive.', //'Stoned yet aggressive. Sometimes trips are good trips, sometimes they are not.',
    SSugar: 'Overstimulated.', //'Overstimulated. Ideal for Blitzkriegs und Verbrechen gegen die Menschlichkeit.',
    Fantanyl: 'Calm.', //'Quite intimidating. Your parents would tell you to avoid him at all costs, wouldn\'t they?',
  };
  const WEAPON_TYPE_TOOLTIPS: Record<string, string> = {
    SimpleGun: 'Standard weapon. Shoots one bullet at a time.', // Use it if you like getting bored or mogging your nooby friends.',
    MachineGun: 'Rapid fire with limited range. Good for close combat.', // Perfect for who likes spamming a button until developing carpal tunnel syndrome.',
    LaserWhipGun: 'Allows fast shooting and instant teleportation.', // Can cause headaches to you and others.',
    GrappleGun: 'Shoots volleys that can stick to the ground. Good for open space control.', // Use it in narrow spaces to blow your own a*s.',
    MitosisGun: 'Splits shots into multiple projectiles. Great for strategic field control.', // After some practice you will stop questioning the game developer mental stability.',
  };

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

  const tankSetupPreview = document.createElement('div');
  tankSetupPreview.style.fontSize = '11px';
  tankSetupPreview.style.color = '#93c5fd';
  tankSetupPreview.style.minHeight = '14px';
  tankSetupPreview.style.marginTop = '-4px';

  // Custom tooltip for tank type
  const tankTooltip = document.createElement('div');
  tankTooltip.style.fontSize = '12px';
  tankTooltip.style.color = '#a5b4fc';
  tankTooltip.style.marginTop = '-6px';
  tankTooltip.style.marginBottom = '2px';
  tankTooltip.style.minHeight = '16px';
  tankTooltip.style.transition = 'opacity 0.2s';
  tankTooltip.style.opacity = '1';

  const weaponLabel = document.createElement('label');
  weaponLabel.textContent = 'Weapon';
  weaponLabel.htmlFor = 'join-weapon-type';
  weaponLabel.style.fontSize = '13px';

  const weaponLabelRow = document.createElement('div');
  weaponLabelRow.style.display = 'flex';
  weaponLabelRow.style.alignItems = 'center';
  weaponLabelRow.style.justifyContent = 'space-between';

  const weaponSetupButton = document.createElement('button');
  weaponSetupButton.type = 'button';
  weaponSetupButton.textContent = '⚙';
  weaponSetupButton.title = 'Weapon Setup';
  weaponSetupButton.setAttribute('aria-label', 'Open weapon setup wizard');
  weaponSetupButton.style.width = '28px';
  weaponSetupButton.style.height = '28px';
  weaponSetupButton.style.borderRadius = '8px';
  weaponSetupButton.style.border = '1px solid #475569';
  weaponSetupButton.style.background = '#0b1221';
  weaponSetupButton.style.color = '#bfdbfe';
  weaponSetupButton.style.cursor = 'pointer';
  weaponSetupButton.style.fontSize = '16px';

  weaponLabelRow.appendChild(weaponLabel);
  weaponLabelRow.appendChild(weaponSetupButton);


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

  const weaponSetupPreview = document.createElement('div');
  weaponSetupPreview.style.fontSize = '11px';
  weaponSetupPreview.style.color = '#93c5fd';
  weaponSetupPreview.style.minHeight = '14px';
  weaponSetupPreview.style.marginTop = '-4px';

  // Custom tooltip for weapon type
  const weaponTooltip = document.createElement('div');
  weaponTooltip.style.fontSize = '12px';
  weaponTooltip.style.color = '#a5b4fc';
  weaponTooltip.style.marginTop = '-6px';
  weaponTooltip.style.marginBottom = '2px';
  weaponTooltip.style.minHeight = '16px';
  weaponTooltip.style.transition = 'opacity 0.2s';
  weaponTooltip.style.opacity = '1';

  const shieldLabel = document.createElement('label');
  shieldLabel.textContent = 'Shield';
  shieldLabel.htmlFor = 'join-shield-type';
  shieldLabel.style.fontSize = '13px';

  const shieldSelect = document.createElement('select');
  shieldSelect.id = 'join-shield-type';
  shieldSelect.style.height = '36px';
  shieldSelect.style.borderRadius = '8px';
  shieldSelect.style.border = '1px solid #475569';
  shieldSelect.style.background = '#020617';
  shieldSelect.style.color = '#e2e8f0';
  shieldSelect.style.padding = '0 10px';

  for (const shieldType of ALL_SHIELD_TYPES) {
    const option = document.createElement('option');
    option.value = shieldType;
    option.textContent = shieldType;
    shieldSelect.appendChild(option);
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
  panel.appendChild(tankLabelRow);
  panel.appendChild(tankSelect);
  panel.appendChild(tankSetupPreview);
  panel.appendChild(tankTooltip);
  panel.appendChild(weaponLabelRow);
  panel.appendChild(weaponSelect);
  panel.appendChild(weaponSetupPreview);
  panel.appendChild(weaponTooltip);
  panel.appendChild(shieldLabel);
  panel.appendChild(shieldSelect);
  panel.appendChild(previewContainer);
  panel.appendChild(errorText);
  panel.appendChild(confirmButton);

  overlay.appendChild(panel);
  appHost.appendChild(overlay);

  const tankSetupByTank: Record<TankType, TankSetupInput> = {
    PolPot: { ...DEFAULT_TANK_SETUP_BY_TANK.PolPot },
    Hightillery: { ...DEFAULT_TANK_SETUP_BY_TANK.Hightillery },
    SSugar: { ...DEFAULT_TANK_SETUP_BY_TANK.SSugar },
    Fantanyl: { ...DEFAULT_TANK_SETUP_BY_TANK.Fantanyl },
  };
  const cloneWeaponSetupByType = <T extends WeaponType>(
    weaponType: T,
    setup: WeaponSetupInputByWeaponType[T],
  ): WeaponSetupInputByWeaponType[T] => {
    if (weaponType === 'GrappleGun') {
      const typedSetup = setup as WeaponSetupInputByWeaponType['GrappleGun'];
      return {
        ...typedSetup,
        normalShot: { ...typedSetup.normalShot },
        chargedShot: { ...typedSetup.chargedShot },
        volleyAngleOffsetsRadians: [...typedSetup.volleyAngleOffsetsRadians],
      } as WeaponSetupInputByWeaponType[T];
    }

    if (weaponType === 'MachineGun') {
      const typedSetup = setup as WeaponSetupInputByWeaponType['MachineGun'];
      return {
        ...typedSetup,
        bullet: { ...typedSetup.bullet },
      } as WeaponSetupInputByWeaponType[T];
    }

    if (weaponType === 'LaserWhipGun') {
      const typedSetup = setup as WeaponSetupInputByWeaponType['LaserWhipGun'];
      return {
        ...typedSetup,
        normalShot: { ...typedSetup.normalShot },
        chargedShot: { ...typedSetup.chargedShot },
        whip: { ...typedSetup.whip },
      } as WeaponSetupInputByWeaponType[T];
    }

    const typedSetup = setup as WeaponSetupInputByWeaponType['SimpleGun'] | WeaponSetupInputByWeaponType['MitosisGun'];
    return {
      ...typedSetup,
      normalShot: { ...typedSetup.normalShot },
      chargedShot: { ...typedSetup.chargedShot },
    } as WeaponSetupInputByWeaponType[T];
  };

  const weaponSetupByWeapon: WeaponSetupInputByWeaponType = {
    SimpleGun: cloneWeaponSetupByType('SimpleGun', DEFAULT_WEAPON_SETUP_BY_WEAPON.SimpleGun),
    MitosisGun: cloneWeaponSetupByType('MitosisGun', DEFAULT_WEAPON_SETUP_BY_WEAPON.MitosisGun),
    MachineGun: cloneWeaponSetupByType('MachineGun', DEFAULT_WEAPON_SETUP_BY_WEAPON.MachineGun),
    GrappleGun: cloneWeaponSetupByType('GrappleGun', DEFAULT_WEAPON_SETUP_BY_WEAPON.GrappleGun),
    LaserWhipGun: cloneWeaponSetupByType('LaserWhipGun', DEFAULT_WEAPON_SETUP_BY_WEAPON.LaserWhipGun),
  };
  let closeTankSetupWizard: (() => void) | undefined;
  let closeWeaponSetupWizard: (() => void) | undefined;

  const getSelectedTankSetup = (): TankSetupInput => {
    const selectedTankType = tankSelect.value as TankType;
    return tankSetupByTank[selectedTankType];
  };

  const updateTankSetupPreview = (): void => {
    const setup = getSelectedTankSetup();
    tankSetupPreview.textContent = `Setup: move ${Math.round(setup.moveSpeed)}, rot ${setup.rotationSpeedPiFactor.toFixed(2)}pi, boost x${setup.boostMultiplier.toFixed(2)}, ${Math.round(setup.boostDurationMs)}ms`;
  };

  const getSelectedWeaponSetup = (): WeaponSetupInput => {
    const selectedWeaponType = weaponSelect.value as WeaponType;
    return weaponSetupByWeapon[selectedWeaponType];
  };

  const updateWeaponSetupPreview = (): void => {
    const selectedWeaponType = weaponSelect.value as WeaponType;
    const setup = getSelectedWeaponSetup();
    weaponSetupPreview.textContent = `Setup (${selectedWeaponType}): max ${setup.maxActiveBullets}, cd ${Math.round(setup.normalShotCooldownMs)}/${Math.round(setup.chargedShotCooldownMs)}ms`;
  };


  const updateTooltips = (): void => {
    const tankType = tankSelect.value as TankType;
    const weaponType = weaponSelect.value as WeaponType;
    tankTooltip.textContent = TANK_TYPE_TOOLTIPS[tankType] || '';
    weaponTooltip.textContent = WEAPON_TYPE_TOOLTIPS[weaponType] || '';
  };

  const updatePreview = (): void => {
    const playerName = nameInput.value.trim();
    const tankType = tankSelect.value as TankType;
    const weaponType = weaponSelect.value as WeaponType;
    const shieldType = shieldSelect.value as ShieldType;
    const color = TANK_PREVIEW_COLORS[tankType] ?? '#94a3b8';

    colorSwatch.style.backgroundColor = color;
    previewText.textContent = `${playerName.length > 0 ? playerName : 'YourName'} -> ${tankType} / ${weaponType} / ${shieldType}`;
    updateTooltips();
    updateTankSetupPreview();
    updateWeaponSetupPreview();
  };

  tankSetupButton.addEventListener('click', () => {
    closeWeaponSetupWizard?.();
    closeTankSetupWizard?.();
    const selectedTankType = tankSelect.value as TankType;
    closeTankSetupWizard = showTankConfigWizard({
      host: overlay,
      anchor: tankSetupButton,
      tankType: selectedTankType,
      currentSetup: { ...tankSetupByTank[selectedTankType] },
      defaultSetup: DEFAULT_TANK_SETUP_BY_TANK[selectedTankType],
      onApply: (setup) => {
        tankSetupByTank[selectedTankType] = setup;
        updatePreview();
      },
      onClose: () => {
        closeTankSetupWizard = undefined;
      },
    });
  });

  weaponSetupButton.addEventListener('click', () => {
    closeTankSetupWizard?.();
    closeWeaponSetupWizard?.();
    const selectedWeaponType = weaponSelect.value as WeaponType;
    closeWeaponSetupWizard = showWeaponConfigWizard({
      host: overlay,
      anchor: weaponSetupButton,
      weaponType: selectedWeaponType,
      currentSetup: cloneWeaponSetupByType(selectedWeaponType, weaponSetupByWeapon[selectedWeaponType]),
      defaultSetup: cloneWeaponSetupByType(selectedWeaponType, DEFAULT_WEAPON_SETUP_BY_WEAPON[selectedWeaponType]),
      onApply: (setup) => {
        if (selectedWeaponType === 'SimpleGun') {
          weaponSetupByWeapon.SimpleGun = cloneWeaponSetupByType('SimpleGun', setup as WeaponSetupInputByWeaponType['SimpleGun']);
        } else if (selectedWeaponType === 'MitosisGun') {
          weaponSetupByWeapon.MitosisGun = cloneWeaponSetupByType('MitosisGun', setup as WeaponSetupInputByWeaponType['MitosisGun']);
        } else if (selectedWeaponType === 'MachineGun') {
          weaponSetupByWeapon.MachineGun = cloneWeaponSetupByType('MachineGun', setup as WeaponSetupInputByWeaponType['MachineGun']);
        } else if (selectedWeaponType === 'GrappleGun') {
          weaponSetupByWeapon.GrappleGun = cloneWeaponSetupByType('GrappleGun', setup as WeaponSetupInputByWeaponType['GrappleGun']);
        } else {
          weaponSetupByWeapon.LaserWhipGun = cloneWeaponSetupByType('LaserWhipGun', setup as WeaponSetupInputByWeaponType['LaserWhipGun']);
        }
        updatePreview();
      },
      onClose: () => {
        closeWeaponSetupWizard = undefined;
      },
    });
  });

  nameInput.addEventListener('input', updatePreview);
  tankSelect.addEventListener('change', () => {
    closeTankSetupWizard?.();
    closeWeaponSetupWizard?.();
    const selectedTankType = tankSelect.value as TankType;
    weaponSelect.value = DEFAULT_WEAPON_BY_TANK[selectedTankType];
    shieldSelect.value = DEFAULT_SHIELD_BY_TANK[selectedTankType];
    updatePreview();
  });
  weaponSelect.addEventListener('change', () => {
    closeWeaponSetupWizard?.();
    updatePreview();
  });
  shieldSelect.addEventListener('change', updatePreview);

  panel.addEventListener('submit', (event) => {
    event.preventDefault();

    const playerId = nameInput.value.trim();
    const selectedTankType = tankSelect.value;
    const selectedWeaponType = weaponSelect.value;
    const selectedShieldType = shieldSelect.value;

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
    if (!isShieldType(selectedShieldType)) {
      errorText.textContent = 'Please choose a valid shield.';
      return;
    }

    closeTankSetupWizard?.();
    closeWeaponSetupWizard?.();
    overlay.remove();
    onSubmit({
      playerId,
      tankType: selectedTankType,
      weaponType: selectedWeaponType,
      shieldType: selectedShieldType,
      tankSetup: { ...getSelectedTankSetup() },
      weaponSetup: cloneWeaponSetupByType(selectedWeaponType, getSelectedWeaponSetup() as WeaponSetupInputByWeaponType[typeof selectedWeaponType]),
    });
  });

  weaponSelect.value = DEFAULT_WEAPON_BY_TANK[tankSelect.value as TankType];
  shieldSelect.value = DEFAULT_SHIELD_BY_TANK[tankSelect.value as TankType];
  updatePreview();
  nameInput.focus();
}
