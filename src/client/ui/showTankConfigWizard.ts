import { type TankSetupInput, type TankType } from '../../shared/types';
import { TANK_LIMITS } from '../../shared/constants.js';

interface TankConfigWizardOptions {
  host: HTMLElement;
  anchor: HTMLElement;
  tankType: TankType;
  currentSetup: TankSetupInput;
  defaultSetup: TankSetupInput;
  onApply: (setup: TankSetupInput) => void;
  onClose: () => void;
}

interface TankConfigFieldSpec {
  key: keyof TankSetupInput;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  tooltip?: string;
}

function buildFieldSpecs(tankType: TankType): TankConfigFieldSpec[] {
  const limits = TANK_LIMITS[tankType];
  return [
    { key: 'moveSpeed',
      label: 'Move Speed', ...limits.moveSpeed,
      step: 5,
      tooltip: 'Base speed of the tank.',},
    { key: 'rotationSpeedPiFactor',
      label: 'Rotation x PI', ...limits.rotationSpeedPiFactor,
      step: 0.2,
      suffix: 'pi',
      tooltip: 'Rotation speed of the tank in multiples of PI' },
    { key: 'boostMultiplier',
      label: 'Boost Multiplier', ...limits.boostMultiplier,
      step: 0.1,
      tooltip: 'Multiplier applied to the tank\'s speed during a boost' },
    { key: 'boostDurationMs',
      label: 'Boost Duration', ...limits.boostDurationMs,
      step: 100,
      suffix: 'ms',
      tooltip: 'Duration of the tank\'s boost in milliseconds' },
  ];
}

export function showTankConfigWizard(options: TankConfigWizardOptions): () => void {
  const fieldSpecs = buildFieldSpecs(options.tankType);
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.zIndex = '10000';
  panel.style.width = 'min(92vw, 300px)';
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
  title.textContent = `Tank Setup - ${options.tankType}`;
  title.style.fontSize = '13px';
  title.style.fontWeight = '700';
  title.style.color = '#c7d2fe';

  panel.appendChild(title);

  const fieldInputs = new Map<keyof TankSetupInput, HTMLInputElement>();

  for (const field of fieldSpecs) {
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr 110px';
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
    input.value = String(options.currentSetup[field.key]);
    input.style.height = '30px';
    input.style.borderRadius = '8px';
    input.style.border = '1px solid #475569';
    input.style.background = '#020617';
    input.style.color = '#e2e8f0';
    input.style.padding = '0 8px';

    row.appendChild(label);
    row.appendChild(input);
    panel.appendChild(row);
    fieldInputs.set(field.key, input);
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

  const anchorRect = options.anchor.getBoundingClientRect();
  const estimatedWidth = 300;
  const left = Math.max(8, Math.min(anchorRect.left - estimatedWidth + anchorRect.width, window.innerWidth - estimatedWidth - 8));
  panel.style.left = `${left}px`;
  panel.style.top = `${Math.min(window.innerHeight - 12, anchorRect.bottom + 8)}px`;

  const parseSetup = (): TankSetupInput | undefined => {
    const setup: Partial<TankSetupInput> = {};

    for (const field of fieldSpecs) {
      const input = fieldInputs.get(field.key);
      if (input === undefined) {
        return undefined;
      }

      const value = Number(input.value);
      if (!Number.isFinite(value) || value < field.min || value > field.max) {
        errorText.textContent = `${field.label} must be between ${field.min} and ${field.max}.`;
        return undefined;
      }

      setup[field.key] = value;
    }

    errorText.textContent = '';
    return setup as TankSetupInput;
  };

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
    for (const field of fieldSpecs) {
      const input = fieldInputs.get(field.key);
      if (input !== undefined) {
        input.value = String(options.defaultSetup[field.key]);
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
  setTimeout(() => document.addEventListener('mousedown', onOutsidePointerDown), 0);

  return close;
}
