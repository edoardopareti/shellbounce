import {
  type ChargedBulletWeaponSetupInput,
  type GrappleWeaponLimits,
  type LaserWhipWeaponSetupInput,
  type MachineGunWeaponSetupInput,
  type VolleyWeaponSetupInput,
  type WeaponLimitsByType,
  type WeaponSetupInput,
  type WeaponType,
} from '../../shared/types';
import {
  WEAPON_LIMITS,
} from '../../shared/constants';

interface WeaponConfigWizardOptions {
  host: HTMLElement;
  anchor: HTMLElement;
  weaponType: WeaponType;
  currentSetup: WeaponSetupInput;
  defaultSetup: WeaponSetupInput;
  onApply: (setup: WeaponSetupInput) => void;
  onClose: () => void;
}

interface NumberFieldSpec {
  kind: 'number';
  label: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  getValue: (setup: WeaponSetupInput) => number;
  setValue: (setup: WeaponSetupInput, value: number) => void;
}

interface BooleanFieldSpec {
  kind: 'boolean';
  label: string;
  getValue: (setup: WeaponSetupInput) => boolean;
  setValue: (setup: WeaponSetupInput, value: boolean) => void;
}

type FieldSpec = NumberFieldSpec | BooleanFieldSpec;

function cloneWeaponSetup(setup: WeaponSetupInput): WeaponSetupInput {
  if ('volleyAngleOffsetsRadians' in setup) {
    return {
      ...setup,
      normalShot: { ...setup.normalShot },
      chargedShot: { ...setup.chargedShot },
      volleyAngleOffsetsRadians: [...setup.volleyAngleOffsetsRadians],
    };
  }

  if ('bullet' in setup) {
    return {
      ...setup,
      bullet: { ...setup.bullet },
    };
  }

  if ('whip' in setup) {
    return {
      ...setup,
      normalShot: { ...setup.normalShot },
      chargedShot: { ...setup.chargedShot },
      whip: { ...setup.whip },
    };
  }

  return {
    ...setup,
    normalShot: { ...setup.normalShot },
    chargedShot: { ...setup.chargedShot },
  };
}

function buildFieldSpecs(weaponType: WeaponType): FieldSpec[] {
  const commonLimits = WEAPON_LIMITS[weaponType];

  const common: FieldSpec[] = [
    {
      kind: 'number',
      label: 'Max Active Bullets',
      min: commonLimits.maxActiveBullets.min,
      max: commonLimits.maxActiveBullets.max,
      step: 1,
      getValue: (setup) => setup.maxActiveBullets,
      setValue: (setup, value) => { setup.maxActiveBullets = value; },
    },
    {
      kind: 'number',
      label: 'Normal Cooldown',
      min: commonLimits.normalShotCooldownMs.min,
      max: commonLimits.normalShotCooldownMs.max,
      step: 5,
      suffix: 'ms',
      getValue: (setup) => setup.normalShotCooldownMs,
      setValue: (setup, value) => { setup.normalShotCooldownMs = value; },
    },
    {
      kind: 'number',
      label: 'Charged Cooldown',
      min: commonLimits.chargedShotCooldownMs.min,
      max: commonLimits.chargedShotCooldownMs.max,
      step: 25,
      suffix: 'ms',
      getValue: (setup) => setup.chargedShotCooldownMs,
      setValue: (setup, value) => { setup.chargedShotCooldownMs = value; },
    },
  ];

  const chargedBulletCommon = (
    limits: WeaponLimitsByType['SimpleGun'] | WeaponLimitsByType['MitosisGun'] | WeaponLimitsByType['GrappleGun'],
  ): FieldSpec[] => [
    {
      kind: 'number',
      label: 'Shot Speed',
      min: limits.normalShotSpeed.min,
      max: limits.normalShotSpeed.max,
      step: 25,
      getValue: (setup) => (setup as ChargedBulletWeaponSetupInput).normalShot.speed,
      setValue: (setup, value) => { (setup as ChargedBulletWeaponSetupInput).normalShot.speed = value; },
    },
    {
      kind: 'number',
      label: 'Explosion Radius',
      min: limits.normalShotExplosionRadius.min,
      max: limits.normalShotExplosionRadius.max,
      step: 5,
      getValue: (setup) => (setup as ChargedBulletWeaponSetupInput).normalShot.explosionRadius,
      setValue: (setup, value) => { (setup as ChargedBulletWeaponSetupInput).normalShot.explosionRadius = value; },
    },
    {
      kind: 'number',
      label: 'Normal Max Bounces',
      min: limits.normalShotMaxBounces.min,
      max: limits.normalShotMaxBounces.max,
      step: 1,
      getValue: (setup) => (setup as ChargedBulletWeaponSetupInput).normalShot.maxBounces,
      setValue: (setup, value) => { (setup as ChargedBulletWeaponSetupInput).normalShot.maxBounces = value; },
    },
    {
      kind: 'number',
      label: 'Shot Lifetime',
      min: limits.normalShotMaxLifetimeMs.min,
      max: limits.normalShotMaxLifetimeMs.max,
      step: 100,
      suffix: 'ms',
      getValue: (setup) => (setup as ChargedBulletWeaponSetupInput).normalShot.maxLifetimeMs ?? 0,
      setValue: (setup, value) => { (setup as ChargedBulletWeaponSetupInput).normalShot.maxLifetimeMs = value; },
    },
    {
      kind: 'boolean',
      label: 'Normal Explode On Wall',
      getValue: (setup) => (setup as ChargedBulletWeaponSetupInput).normalShot.explodeOnWallImpact,
      setValue: (setup, value) => { (setup as ChargedBulletWeaponSetupInput).normalShot.explodeOnWallImpact = value; },
    },
    {
      kind: 'boolean',
      label: 'Normal Is Charged',
      getValue: (setup) => (setup as ChargedBulletWeaponSetupInput).normalShot.isCharged,
      setValue: (setup, value) => { (setup as ChargedBulletWeaponSetupInput).normalShot.isCharged = value; },
    },
    {
      kind: 'number',
      label: 'Charged Speed Multiplier',
      min: limits.chargedSpeedMultiplier.min,
      max: limits.chargedSpeedMultiplier.max,
      step: 0.1,
      getValue: (setup) => (setup as ChargedBulletWeaponSetupInput).chargedShot.speedMultiplier,
      setValue: (setup, value) => { (setup as ChargedBulletWeaponSetupInput).chargedShot.speedMultiplier = value; },
    },
    {
      kind: 'number',
      label: 'Charged Explosion Multiplier',
      min: limits.chargedExplosionRadiusMultiplier.min,
      max: limits.chargedExplosionRadiusMultiplier.max,
      step: 0.1,
      getValue: (setup) => (setup as ChargedBulletWeaponSetupInput).chargedShot.explosionRadiusMultiplier,
      setValue: (setup, value) => { (setup as ChargedBulletWeaponSetupInput).chargedShot.explosionRadiusMultiplier = value; },
    },
    {
      kind: 'number',
      label: 'Charged Max Bounces',
      min: limits.chargedMaxBounces.min,
      max: limits.chargedMaxBounces.max,
      step: 1,
      getValue: (setup) => (setup as ChargedBulletWeaponSetupInput).chargedShot.maxBounces,
      setValue: (setup, value) => { (setup as ChargedBulletWeaponSetupInput).chargedShot.maxBounces = value; },
    },
    {
      kind: 'boolean',
      label: 'Charged Explode On Wall',
      getValue: (setup) => (setup as ChargedBulletWeaponSetupInput).chargedShot.explodeOnWallImpact,
      setValue: (setup, value) => { (setup as ChargedBulletWeaponSetupInput).chargedShot.explodeOnWallImpact = value; },
    },
    {
      kind: 'boolean',
      label: 'Charged Is Charged',
      getValue: (setup) => (setup as ChargedBulletWeaponSetupInput).chargedShot.isCharged,
      setValue: (setup, value) => { (setup as ChargedBulletWeaponSetupInput).chargedShot.isCharged = value; },
    },
  ];

  if (weaponType === 'SimpleGun' || weaponType === 'MitosisGun') {
    return [...common, ...chargedBulletCommon(WEAPON_LIMITS[weaponType])];
  }

  if (weaponType === 'MachineGun') {
    const limits = WEAPON_LIMITS.MachineGun;
    return [
      ...common,
      {
        kind: 'number',
        label: 'Shot Speed',
        min: limits.normalShotSpeed.min,
        max: limits.normalShotSpeed.max,
        step: 25,
        getValue: (setup) => (setup as MachineGunWeaponSetupInput).bullet.speed,
        setValue: (setup, value) => { (setup as MachineGunWeaponSetupInput).bullet.speed = value; },
      },
      {
        kind: 'number',
        label: 'Explosion Radius',
        min: limits.normalShotExplosionRadius.min,
        max: limits.normalShotExplosionRadius.max,
        step: 5,
        getValue: (setup) => (setup as MachineGunWeaponSetupInput).bullet.explosionRadius,
        setValue: (setup, value) => { (setup as MachineGunWeaponSetupInput).bullet.explosionRadius = value; },
      },
      {
        kind: 'number',
        label: 'Bullet Max Bounces',
        min: limits.normalShotMaxBounces.min,
        max: limits.normalShotMaxBounces.max,
        step: 1,
        getValue: (setup) => (setup as MachineGunWeaponSetupInput).bullet.maxBounces,
        setValue: (setup, value) => { (setup as MachineGunWeaponSetupInput).bullet.maxBounces = value; },
      },
      {
        kind: 'number',
        label: 'Bullet Radius',
        min: limits.normalShotRadius.min,
        max: limits.normalShotRadius.max,
        step: 1,
        getValue: (setup) => (setup as MachineGunWeaponSetupInput).bullet.radius ?? 0,
        setValue: (setup, value) => { (setup as MachineGunWeaponSetupInput).bullet.radius = value; },
      },
      {
        kind: 'number',
        label: 'Bullet Lifetime',
        min: limits.normalShotMaxLifetimeMs.min,
        max: limits.normalShotMaxLifetimeMs.max,
        step: 100,
        suffix: 'ms',
        getValue: (setup) => (setup as MachineGunWeaponSetupInput).bullet.maxLifetimeMs ?? 0,
        setValue: (setup, value) => { (setup as MachineGunWeaponSetupInput).bullet.maxLifetimeMs = value; },
      },
      {
        kind: 'boolean',
        label: 'Bullet Explode On Wall',
        getValue: (setup) => (setup as MachineGunWeaponSetupInput).bullet.explodeOnWallImpact,
        setValue: (setup, value) => { (setup as MachineGunWeaponSetupInput).bullet.explodeOnWallImpact = value; },
      },
      {
        kind: 'boolean',
        label: 'Bullet Is Charged',
        getValue: (setup) => (setup as MachineGunWeaponSetupInput).bullet.isCharged,
        setValue: (setup, value) => { (setup as MachineGunWeaponSetupInput).bullet.isCharged = value; },
      },
      {
        kind: 'number',
        label: 'Rapid Fire Hold',
        min: limits.holdToRapidFireMs.min,
        max: limits.holdToRapidFireMs.max,
        step: 25,
        suffix: 'ms',
        getValue: (setup) => (setup as MachineGunWeaponSetupInput).holdToRapidFireMs,
        setValue: (setup, value) => { (setup as MachineGunWeaponSetupInput).holdToRapidFireMs = value; },
      },
    ];
  }

  if (weaponType === 'LaserWhipGun') {
    const limits = WEAPON_LIMITS.LaserWhipGun;
    return [
      ...common,
      {
        kind: 'number',
        label: 'Shot Speed',
        min: limits.normalShotSpeed.min,
        max: limits.normalShotSpeed.max,
        step: 25,
        getValue: (setup) => (setup as LaserWhipWeaponSetupInput).normalShot.speed,
        setValue: (setup, value) => { (setup as LaserWhipWeaponSetupInput).normalShot.speed = value; },
      },
      {
        kind: 'number',
        label: 'Explosion Radius',
        min: limits.normalShotExplosionRadius.min,
        max: limits.normalShotExplosionRadius.max,
        step: 5,
        getValue: (setup) => (setup as LaserWhipWeaponSetupInput).normalShot.explosionRadius,
        setValue: (setup, value) => { (setup as LaserWhipWeaponSetupInput).normalShot.explosionRadius = value; },
      },
      {
        kind: 'number',
        label: 'Normal Max Bounces',
        min: limits.normalShotMaxBounces.min,
        max: limits.normalShotMaxBounces.max,
        step: 1,
        getValue: (setup) => (setup as LaserWhipWeaponSetupInput).normalShot.maxBounces,
        setValue: (setup, value) => { (setup as LaserWhipWeaponSetupInput).normalShot.maxBounces = value; },
      },
      {
        kind: 'number',
        label: 'Laser Length',
        min: limits.normalShotLaserLength.min,
        max: limits.normalShotLaserLength.max,
        step: 5,
        getValue: (setup) => (setup as LaserWhipWeaponSetupInput).normalShot.laserLength,
        setValue: (setup, value) => { (setup as LaserWhipWeaponSetupInput).normalShot.laserLength = value; },
      },
      {
        kind: 'number',
        label: 'Laser Radius',
        min: limits.normalShotRadius.min,
        max: limits.normalShotRadius.max,
        step: 5,
        getValue: (setup) => (setup as LaserWhipWeaponSetupInput).normalShot.radius,
        setValue: (setup, value) => { (setup as LaserWhipWeaponSetupInput).normalShot.radius = value; },
      },
      {
        kind: 'number',
        label: 'Laser Lifetime',
        min: limits.normalShotMaxLifetimeMs.min,
        max: limits.normalShotMaxLifetimeMs.max,
        step: 100,
        suffix: 'ms',
        getValue: (setup) => (setup as LaserWhipWeaponSetupInput).normalShot.maxLifetimeMs,
        setValue: (setup, value) => { (setup as LaserWhipWeaponSetupInput).normalShot.maxLifetimeMs = value; },
      },
      {
        kind: 'number',
        label: 'Pull Step Distance',
        min: limits.whipPullStepDistance.min,
        max: limits.whipPullStepDistance.max,
        step: 10,
        getValue: (setup) => (setup as LaserWhipWeaponSetupInput).whip.pullStepDistance,
        setValue: (setup, value) => { (setup as LaserWhipWeaponSetupInput).whip.pullStepDistance = value; },
      },
      {
        kind: 'number',
        label: 'Charged Speed Multiplier',
        min: limits.chargedSpeedMultiplier.min,
        max: limits.chargedSpeedMultiplier.max,
        step: 0.1,
        getValue: (setup) => (setup as LaserWhipWeaponSetupInput).chargedShot.speedMultiplier,
        setValue: (setup, value) => { (setup as LaserWhipWeaponSetupInput).chargedShot.speedMultiplier = value; },
      },
      {
        kind: 'number',
        label: 'Charged Max Bounces',
        min: limits.chargedMaxBounces.min,
        max: limits.chargedMaxBounces.max,
        step: 1,
        getValue: (setup) => (setup as LaserWhipWeaponSetupInput).chargedShot.maxBounces,
        setValue: (setup, value) => { (setup as LaserWhipWeaponSetupInput).chargedShot.maxBounces = value; },
      },
      {
        kind: 'boolean',
        label: 'Charged Is Charged',
        getValue: (setup) => (setup as LaserWhipWeaponSetupInput).chargedShot.isCharged,
        setValue: (setup, value) => { (setup as LaserWhipWeaponSetupInput).chargedShot.isCharged = value; },
      },
    ];
  }

  const grappleLimits = WEAPON_LIMITS.GrappleGun as GrappleWeaponLimits;
  return [
    ...common,
    ...chargedBulletCommon(grappleLimits),
    {
      kind: 'number',
      label: 'Volley Spread',
      min: 0,
      max: grappleLimits.volleyAngleOffsetRadians.max,
      step: 0.1,
      suffix: 'rad',
      getValue: (setup) => {
        const grapple = setup as VolleyWeaponSetupInput;
        return Math.max(...grapple.volleyAngleOffsetsRadians.map((entry) => Math.abs(entry)));
      },
      setValue: (setup, value) => {
        const grapple = setup as VolleyWeaponSetupInput;
        grapple.volleyAngleOffsetsRadians = [-value, 0, value];
      },
    },
    {
      kind: 'number',
      label: 'Armed Detonation Delay',
      min: grappleLimits.grappleArmedDetonationDelayMs.min,
      max: grappleLimits.grappleArmedDetonationDelayMs.max,
      step: 100,
      suffix: 'ms',
      getValue: (setup) => (setup as VolleyWeaponSetupInput).grappleArmedDetonationDelayMs ?? 0,
      setValue: (setup, value) => { (setup as VolleyWeaponSetupInput).grappleArmedDetonationDelayMs = value; },
    },
    {
      kind: 'number',
      label: 'Manual Detonation Min Delay',
      min: grappleLimits.grappleManualDetonationMinDelayMs.min,
      max: grappleLimits.grappleManualDetonationMinDelayMs.max,
      step: 100,
      suffix: 'ms',
      getValue: (setup) => (setup as VolleyWeaponSetupInput).grappleManualDetonationMinDelayMs ?? 0,
      setValue: (setup, value) => { (setup as VolleyWeaponSetupInput).grappleManualDetonationMinDelayMs = value; },
    },
    {
      kind: 'boolean',
      label: 'Requires Empty Chamber',
      getValue: (setup) => (setup as VolleyWeaponSetupInput).requiresEmptyChamberToShoot,
      setValue: (setup, value) => { (setup as VolleyWeaponSetupInput).requiresEmptyChamberToShoot = value; },
    },
  ];
}

export function showWeaponConfigWizard(options: WeaponConfigWizardOptions): () => void {
  const fieldSpecs = buildFieldSpecs(options.weaponType);
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.zIndex = '10000';
  panel.style.width = 'min(92vw, 320px)';
  panel.style.maxHeight = '70vh';
  panel.style.overflow = 'auto';
  panel.style.display = 'grid';
  panel.style.gap = '9px';
  panel.style.padding = '12px';
  panel.style.border = '1px solid #475569';
  panel.style.borderRadius = '12px';
  panel.style.background = 'linear-gradient(145deg, #0f172a 0%, #111827 100%)';
  panel.style.boxShadow = '0 16px 30px rgba(0, 0, 0, 0.45)';
  panel.style.color = '#e2e8f0';
  panel.style.fontFamily = 'monospace';

  const title = document.createElement('div');
  title.textContent = `Weapon Setup - ${options.weaponType}`;
  title.style.fontSize = '13px';
  title.style.fontWeight = '700';
  title.style.color = '#c7d2fe';
  panel.appendChild(title);

  const fieldInputs = new Map<FieldSpec, HTMLInputElement>();

  for (const field of fieldSpecs) {
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr 120px';
    row.style.alignItems = 'center';
    row.style.gap = '8px';

    const label = document.createElement('label');
    label.textContent = field.kind === 'number' && field.suffix ? `${field.label} (${field.suffix})` : field.label;
    label.style.fontSize = '12px';

    const input = document.createElement('input');
    if (field.kind === 'number') {
      input.type = 'number';
      input.min = String(field.min);
      input.max = String(field.max);
      input.step = String(field.step);
      input.value = String(field.getValue(options.currentSetup));
      input.style.height = '30px';
      input.style.borderRadius = '8px';
      input.style.border = '1px solid #475569';
      input.style.background = '#020617';
      input.style.color = '#e2e8f0';
      input.style.padding = '0 8px';
    } else {
      input.type = 'checkbox';
      input.checked = field.getValue(options.currentSetup);
      input.style.width = '18px';
      input.style.height = '18px';
      row.style.gridTemplateColumns = '1fr auto';
    }

    row.appendChild(label);
    row.appendChild(input);
    panel.appendChild(row);
    fieldInputs.set(field, input);
  }

  const errorText = document.createElement('div');
  errorText.style.minHeight = '16px';
  errorText.style.fontSize = '11px';
  errorText.style.color = '#fca5a5';
  panel.appendChild(errorText);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.gap = '8px';

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.textContent = 'Reset';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.textContent = 'Cancel';

  const applyButton = document.createElement('button');
  applyButton.type = 'button';
  applyButton.textContent = 'Apply';

  for (const button of [resetButton, cancelButton, applyButton]) {
    button.style.height = '30px';
    button.style.padding = '0 10px';
    button.style.borderRadius = '8px';
    button.style.cursor = 'pointer';
  }

  resetButton.style.border = '1px solid #475569';
  resetButton.style.background = '#0b1221';
  resetButton.style.color = '#cbd5e1';

  cancelButton.style.border = '1px solid #475569';
  cancelButton.style.background = '#0b1221';
  cancelButton.style.color = '#cbd5e1';

  applyButton.style.border = 'none';
  applyButton.style.background = '#0ea5e9';
  applyButton.style.color = '#e0f2fe';
  applyButton.style.fontWeight = '700';

  actions.appendChild(resetButton);
  actions.appendChild(cancelButton);
  actions.appendChild(applyButton);
  panel.appendChild(actions);

  const anchorRect = options.anchor.getBoundingClientRect();
  const viewportMargin = 8;
  const verticalGap = 8;
  const estimatedWidth = 320;
  const left = Math.max(
    viewportMargin,
    Math.min(
      anchorRect.left - estimatedWidth + anchorRect.width,
      window.innerWidth - estimatedWidth - viewportMargin,
    ),
  );
  panel.style.left = `${left}px`;

  // Keep the wizard fully visible: prefer below anchor, then above, then clamp.
  const maxHeightFromViewport = Math.max(180, window.innerHeight - (viewportMargin * 2));
  panel.style.maxHeight = `${maxHeightFromViewport}px`;

  const close = (): void => {
    panel.remove();
    document.removeEventListener('mousedown', onOutsidePointerDown);
    options.onClose();
  };

  const onOutsidePointerDown = (event: MouseEvent): void => {
    const eventTarget = event.target;
    if (!(eventTarget instanceof Node)) {
      return;
    }

    if (panel.contains(eventTarget) || options.anchor.contains(eventTarget)) {
      return;
    }

    close();
  };

  const parseSetup = (): WeaponSetupInput | undefined => {
    const setup = cloneWeaponSetup(options.currentSetup);

    for (const field of fieldSpecs) {
      const input = fieldInputs.get(field);
      if (input === undefined) {
        return undefined;
      }

      if (field.kind === 'number') {
        const value = Number(input.value);
        if (!Number.isFinite(value) || value < field.min || value > field.max) {
          errorText.textContent = `${field.label} must be between ${field.min} and ${field.max}.`;
          return undefined;
        }

        field.setValue(setup, value);
      } else {
        field.setValue(setup, input.checked);
      }
    }

    errorText.textContent = '';
    return setup;
  };

  resetButton.addEventListener('click', () => {
    for (const field of fieldSpecs) {
      const input = fieldInputs.get(field);
      if (input === undefined) {
        continue;
      }

      if (field.kind === 'number') {
        input.value = String(field.getValue(options.defaultSetup));
      } else {
        input.checked = field.getValue(options.defaultSetup);
      }
    }

    errorText.textContent = '';
  });

  cancelButton.addEventListener('click', close);

  applyButton.addEventListener('click', () => {
    const setup = parseSetup();
    if (setup === undefined) {
      return;
    }

    options.onApply(setup);
    close();
  });

  options.host.appendChild(panel);

  const panelHeight = panel.offsetHeight;
  const preferredTop = anchorRect.bottom + verticalGap;
  const preferredAboveTop = anchorRect.top - verticalGap - panelHeight;
  const maxTop = window.innerHeight - panelHeight - viewportMargin;
  let top = preferredTop;

  if (preferredTop + panelHeight > window.innerHeight - viewportMargin) {
    top = preferredAboveTop;
  }

  top = Math.max(viewportMargin, Math.min(top, maxTop));
  panel.style.top = `${top}px`;

  const panelWidth = panel.offsetWidth;
  const maxLeft = window.innerWidth - panelWidth - viewportMargin;
  panel.style.left = `${Math.max(viewportMargin, Math.min(left, maxLeft))}px`;

  setTimeout(() => document.addEventListener('mousedown', onOutsidePointerDown), 0);

  return close;
}
