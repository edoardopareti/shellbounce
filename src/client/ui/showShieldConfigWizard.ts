import type {
  ShieldSetupInput,
  ShieldType,
  StandardShieldSetupInput,
} from '../../shared/types';
import { SHIELD_LIMITS } from '../../shared/constants';

interface ShieldConfigWizardOptions {
  host: HTMLElement;
  anchor: HTMLElement;
  shieldType: ShieldType;
  currentSetup: ShieldSetupInput;
  defaultSetup: ShieldSetupInput;
  onApply: (setup: ShieldSetupInput) => void;
  onClose: () => void;
}

interface FieldSpec {
  label: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  getValue: (setup: ShieldSetupInput) => number;
  setValue: (setup: ShieldSetupInput, value: number) => void;
  tooltip?: string;
}

function cloneShieldSetup(setup: ShieldSetupInput): ShieldSetupInput {
  return { ...setup };
}

function buildFieldSpecs(shieldType: ShieldType): FieldSpec[] {
  if (shieldType === 'StandardShield') {
    const limits = SHIELD_LIMITS.StandardShield;
    return [
      {
        label: 'Radius',
        min: limits.radius.min,
        max: limits.radius.max,
        step: 5,
        getValue: (setup) => setup.radius,
        setValue: (setup, value) => { setup.radius = value; },
        tooltip: 'The radius of the shield (StandardShield).',
      },
      {
        label: 'Forward Offset',
        min: limits.forwardOffset.min,
        max: limits.forwardOffset.max,
        step: 1,
        getValue: (setup) => (setup as StandardShieldSetupInput).forwardOffset,
        setValue: (setup, value) => { (setup as StandardShieldSetupInput).forwardOffset = value; },
        tooltip: 'How far in front of the tank the shield is positioned.',
      },
      {
        label: 'Sector Angle',
        min: limits.sectorAngleRadians.min,
        max: limits.sectorAngleRadians.max,
        step: 0.1,
        suffix: 'rad',
        getValue: (setup) => (setup as StandardShieldSetupInput).sectorAngleRadians,
        setValue: (setup, value) => { (setup as StandardShieldSetupInput).sectorAngleRadians = value; },
        tooltip: 'The angle (in radians) covered by the shield sector.',
      },
      {
        label: 'Cooldown',
        min: limits.cooldownMs.min,
        max: limits.cooldownMs.max,
        step: 100,
        suffix: 'ms',
        getValue: (setup) => setup.cooldownMs,
        setValue: (setup, value) => { setup.cooldownMs = value; },
        tooltip: 'Cooldown time before the shield can be used again.',
      },
      {
        label: 'Overcharge',
        min: limits.overchargeMs.min,
        max: limits.overchargeMs.max,
        step: 100,
        suffix: 'ms',
        getValue: (setup) => setup.overchargeMs,
        setValue: (setup, value) => { setup.overchargeMs = value; },
        tooltip: 'Time the shield can be used before its deactivation.',
      },
    ];
  }

  const limits = SHIELD_LIMITS.OmniDirShield;
  return [
    {
      label: 'Radius',
      min: limits.radius.min,
      max: limits.radius.max,
      step: 5,
      getValue: (setup) => setup.radius,
      setValue: (setup, value) => { setup.radius = value; },
      tooltip: 'The radius of the shield (OmniDirShield).',
    },
    {
      label: 'Cooldown',
      min: limits.cooldownMs.min,
      max: limits.cooldownMs.max,
      step: 100,
      suffix: 'ms',
      getValue: (setup) => setup.cooldownMs,
      setValue: (setup, value) => { setup.cooldownMs = value; },
      tooltip: 'Cooldown time before the shield can be used again.',
    },
    {
      label: 'Overcharge',
      min: limits.overchargeMs.min,
      max: limits.overchargeMs.max,
      step: 100,
      suffix: 'ms',
      getValue: (setup) => setup.overchargeMs,
      setValue: (setup, value) => { setup.overchargeMs = value; },
      tooltip: 'Time the shield can be used before its deactivation.',
    },
  ];
}

export function showShieldConfigWizard(options: ShieldConfigWizardOptions): () => void {
  const fieldSpecs = buildFieldSpecs(options.shieldType);
  const draftSetup = cloneShieldSetup(options.currentSetup);

  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.zIndex = '10000';
  panel.style.width = 'min(94vw, 360px)';
  panel.style.maxHeight = '70vh';
  panel.style.overflowY = 'auto';
  panel.style.display = 'grid';
  panel.style.gap = '10px';
  panel.style.padding = '12px';
  panel.style.border = '1px solid #475569';
  panel.style.borderRadius = '12px';
  panel.style.background = 'linear-gradient(145deg, #0f172a 0%, #111827 100%)';
  panel.style.boxShadow = '0 18px 36px rgba(0, 0, 0, 0.45)';
  panel.style.color = '#e2e8f0';
  panel.style.fontFamily = 'monospace';

  const title = document.createElement('div');
  title.textContent = `Shield Setup - ${options.shieldType}`;
  title.style.fontSize = '13px';
  title.style.fontWeight = '700';
  title.style.color = '#c7d2fe';
  panel.appendChild(title);

  const fieldInputs: HTMLInputElement[] = [];
  for (const field of fieldSpecs) {
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr 120px';
    row.style.alignItems = 'center';
    row.style.gap = '8px';

    const label = document.createElement('label');
    label.textContent = field.suffix ? `${field.label} (${field.suffix})` : field.label;
    label.style.fontSize = '12px';
    if ('tooltip' in field && field.tooltip) {
      label.title = field.tooltip;
    }

    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step);
    input.value = String(field.getValue(draftSetup));
    input.style.height = '30px';
    input.style.borderRadius = '8px';
    input.style.border = '1px solid #475569';
    input.style.background = '#020617';
    input.style.color = '#e2e8f0';
    input.style.padding = '0 8px';

    row.appendChild(label);
    row.appendChild(input);
    panel.appendChild(row);
    fieldInputs.push(input);
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
  resetButton.style.height = '30px';
  resetButton.style.padding = '0 10px';
  resetButton.style.border = '1px solid #475569';
  resetButton.style.borderRadius = '8px';
  resetButton.style.background = '#0b1221';
  resetButton.style.color = '#cbd5e1';
  resetButton.style.cursor = 'pointer';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.textContent = 'Cancel';
  cancelButton.style.height = '30px';
  cancelButton.style.padding = '0 10px';
  cancelButton.style.border = '1px solid #475569';
  cancelButton.style.borderRadius = '8px';
  cancelButton.style.background = '#0b1221';
  cancelButton.style.color = '#cbd5e1';
  cancelButton.style.cursor = 'pointer';

  const applyButton = document.createElement('button');
  applyButton.type = 'button';
  applyButton.textContent = 'Apply';
  applyButton.style.height = '30px';
  applyButton.style.padding = '0 10px';
  applyButton.style.border = 'none';
  applyButton.style.borderRadius = '8px';
  applyButton.style.background = '#0ea5e9';
  applyButton.style.color = '#e0f2fe';
  applyButton.style.fontWeight = '700';
  applyButton.style.cursor = 'pointer';

  actions.appendChild(resetButton);
  actions.appendChild(cancelButton);
  actions.appendChild(applyButton);
  panel.appendChild(actions);

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

  resetButton.addEventListener('click', () => {
    for (let index = 0; index < fieldSpecs.length; index += 1) {
      fieldInputs[index].value = String(fieldSpecs[index].getValue(options.defaultSetup));
    }
    errorText.textContent = '';
  });

  cancelButton.addEventListener('click', close);

  applyButton.addEventListener('click', () => {
    for (let index = 0; index < fieldSpecs.length; index += 1) {
      const field = fieldSpecs[index];
      const value = Number(fieldInputs[index].value);
      if (!Number.isFinite(value) || value < field.min || value > field.max) {
        errorText.textContent = `${field.label} must be between ${field.min} and ${field.max}.`;
        return;
      }
      field.setValue(draftSetup, value);
    }

    errorText.textContent = '';
    options.onApply(cloneShieldSetup(draftSetup));
    close();
  });

  options.host.appendChild(panel);

  const verticalGap = 8;
  const horizontalGap = 8;
  const minTop = 8;
  const minLeft = 8;

  const layoutPanel = (): void => {
    const anchorRect = options.anchor.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    const maxPanelHeight = Math.max(220, window.innerHeight - (minTop * 2));
    panel.style.maxHeight = `${Math.floor(maxPanelHeight)}px`;

    const preferredLeft = anchorRect.left - panelRect.width + anchorRect.width;
    const clampedLeft = Math.max(minLeft, Math.min(preferredLeft, window.innerWidth - panelRect.width - minLeft));

    const belowTop = anchorRect.bottom + verticalGap;
    const belowFits = belowTop + panelRect.height <= window.innerHeight - minTop;

    const aboveTop = anchorRect.top - verticalGap - panelRect.height;
    const aboveFits = aboveTop >= minTop;

    let top = belowTop;
    if (!belowFits && aboveFits) {
      top = aboveTop;
    } else if (!belowFits && !aboveFits) {
      const maxTop = window.innerHeight - panelRect.height - minTop;
      top = Math.max(minTop, Math.min(belowTop, maxTop));
    }

    panel.style.left = `${Math.round(clampedLeft)}px`;
    panel.style.top = `${Math.round(top)}px`;
    panel.style.width = `min(${Math.max(240, panelRect.width)}px, calc(100vw - ${horizontalGap * 2}px))`;
  };

  layoutPanel();

  setTimeout(() => document.addEventListener('mousedown', onOutsidePointerDown), 0);

  return close;
}
