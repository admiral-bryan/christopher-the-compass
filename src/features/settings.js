import { showView } from '../core/navigation.js';
import { updateStatus } from '../core/utils.js';
import { DEFAULT_COOKIE_KEY, DEFAULT_COOKIE_VAL, DEFAULT_TARGETING_KEYS } from '../core/storage.js';

export const loadSettingsIntoUI = async () => {
  const settings = await chrome.storage.local.get(['cookieKey', 'cookieVal', 'targetingKeys']);
  const keyInput = document.getElementById('cookieKeyInput');
  const valInput = document.getElementById('cookieValInput');
  const targetInput = document.getElementById('targetingKeysInput');

  if (keyInput) keyInput.value = settings.cookieKey !== undefined ? settings.cookieKey : DEFAULT_COOKIE_KEY;
  if (valInput) valInput.value = settings.cookieVal !== undefined ? settings.cookieVal : DEFAULT_COOKIE_VAL;
  if (targetInput) targetInput.value = settings.targetingKeys !== undefined ? settings.targetingKeys : DEFAULT_TARGETING_KEYS;

  validateSettingsForm();
};

export const validateSettingsForm = () => {
  const keyVal = document.getElementById('cookieKeyInput')?.value.trim() || '';
  const valVal = document.getElementById('cookieValInput')?.value.trim() || '';
  const targetVal = document.getElementById('targetingKeysInput')?.value.trim() || '';
  const saveBtn = document.getElementById('saveSettingsBtn');
  const msgEl = document.getElementById('settingsValidationMsg');

  const isValid = keyVal.length > 0 && valVal.length > 0 && targetVal.length > 0;

  if (saveBtn && msgEl) {
    saveBtn.disabled = !isValid;
    msgEl.style.display = isValid ? "none" : "block";
  }

  return isValid;
};

export const initSettings = () => {
  document.getElementById('cookieKeyInput')?.addEventListener('input', validateSettingsForm);
  document.getElementById('cookieValInput')?.addEventListener('input', validateSettingsForm);
  document.getElementById('targetingKeysInput')?.addEventListener('input', validateSettingsForm);

  document.getElementById('resetKvpsBtn')?.addEventListener('click', () => {
    const targetInput = document.getElementById('targetingKeysInput');
    if (targetInput) {
      targetInput.value = DEFAULT_TARGETING_KEYS;
      validateSettingsForm();
      updateStatus("Restored default targeting KVPs.");
      setTimeout(() => updateStatus(""), 2500);
    }
  });

  document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
    if (!validateSettingsForm()) return;

    const keyVal = document.getElementById('cookieKeyInput')?.value.trim();
    const valVal = document.getElementById('cookieValInput')?.value.trim();
    const targetVal = document.getElementById('targetingKeysInput')?.value.trim();

    await chrome.storage.local.set({
      cookieKey: keyVal,
      cookieVal: valVal,
      targetingKeys: targetVal
    });

    showView('result', `
      <strong>Settings Saved!</strong><br><br>
      Testing Cookie: <code>${keyVal}=${valVal}</code><br><br>
      Targeting KVPs Configured:<br><code>${targetVal}</code>
    `);
  });
};