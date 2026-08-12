import { showView } from '../core/navigation.js';
import { updateStatus } from '../core/utils.js';
import { 
  DEFAULT_COOKIE_KEY, 
  DEFAULT_COOKIE_VAL, 
  DEFAULT_TARGETING_KEYS, 
  DEFAULT_DNS_SELECTOR,
  DEFAULT_DNS_CUSTOM_CSS
} from '../core/storage.js';

export const loadSettingsIntoUI = async () => {
  const store = await chrome.storage.local.get([
    'cookieKey', 
    'cookieVal', 
    'targetingKeys', 
    'dnsSelector',
    'dnsCustomCss'
  ]);

  const keyInput = document.getElementById('cookieKeyInput');
  const valInput = document.getElementById('cookieValInput');
  const targetInput = document.getElementById('targetingKeysInput');
  const dnsInput = document.getElementById('dnsSelectorInput');
  const cssInput = document.getElementById('dnsCustomCssInput');

  if (keyInput) keyInput.value = store.cookieKey !== undefined ? store.cookieKey : DEFAULT_COOKIE_KEY;
  if (valInput) valInput.value = store.cookieVal !== undefined ? store.cookieVal : DEFAULT_COOKIE_VAL;
  if (targetInput) targetInput.value = store.targetingKeys !== undefined ? store.targetingKeys : DEFAULT_TARGETING_KEYS;
  if (dnsInput) dnsInput.value = store.dnsSelector !== undefined ? store.dnsSelector : DEFAULT_DNS_SELECTOR;
  if (cssInput) cssInput.value = store.dnsCustomCss !== undefined ? store.dnsCustomCss : DEFAULT_DNS_CUSTOM_CSS;

  validateSettingsForm();
};

export const validateSettingsForm = () => {
  const keyVal = document.getElementById('cookieKeyInput')?.value.trim() || '';
  const valVal = document.getElementById('cookieValInput')?.value.trim() || '';
  const targetVal = document.getElementById('targetingKeysInput')?.value.trim() || '';
  const dnsVal = document.getElementById('dnsSelectorInput')?.value.trim() || '';

  const saveBtn = document.getElementById('saveSettingsBtn');
  const msgEl = document.getElementById('settingsValidationMsg');

  // Enforce non-empty rules for required inputs
  const isValid = keyVal.length > 0 && valVal.length > 0 && targetVal.length > 0 && dnsVal.length > 0;

  if (saveBtn && msgEl) {
    saveBtn.disabled = !isValid;
    saveBtn.style.opacity = isValid ? "1" : "0.5";
    saveBtn.style.cursor = isValid ? "pointer" : "not-allowed";
    msgEl.style.display = isValid ? "none" : "block";
  }

  return isValid;
};

export const initSettings = () => {
  document.getElementById('cookieKeyInput')?.addEventListener('input', validateSettingsForm);
  document.getElementById('cookieValInput')?.addEventListener('input', validateSettingsForm);
  document.getElementById('targetingKeysInput')?.addEventListener('input', validateSettingsForm);
  document.getElementById('dnsSelectorInput')?.addEventListener('input', validateSettingsForm);

  // Reset Default button handler for Targeting KVPs
  document.getElementById('resetKvpsBtn')?.addEventListener('click', () => {
    const targetInput = document.getElementById('targetingKeysInput');
    if (targetInput) {
      targetInput.value = DEFAULT_TARGETING_KEYS;
      validateSettingsForm();
      updateStatus("Restored default targeting KVPs.");
      setTimeout(() => updateStatus(""), 2500);
    }
  });

  // Reset Default button handler for Parent CSS Selector
  document.getElementById('resetDnsSelectorBtn')?.addEventListener('click', () => {
    const dnsInput = document.getElementById('dnsSelectorInput');
    if (dnsInput) {
      dnsInput.value = DEFAULT_DNS_SELECTOR;
      validateSettingsForm();
      updateStatus("Restored default DNS Parent CSS Selector.");
      setTimeout(() => updateStatus(""), 2500);
    }
  });

  // Save Settings handler
  document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
    if (!validateSettingsForm()) return;

    const keyVal = document.getElementById('cookieKeyInput')?.value.trim();
    const valVal = document.getElementById('cookieValInput')?.value.trim();
    const targetVal = document.getElementById('targetingKeysInput')?.value.trim();
    const dnsVal = document.getElementById('dnsSelectorInput')?.value.trim();
    const cssVal = document.getElementById('dnsCustomCssInput')?.value.trim() || '';

    await chrome.storage.local.set({
      cookieKey: keyVal,
      cookieVal: valVal,
      targetingKeys: targetVal,
      dnsSelector: dnsVal,
      dnsCustomCss: cssVal
    });

    showView('result', `
      <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 6px;">Settings Updated</div>
      <div style="font-size: 14px; color: var(--emerald-accent); font-weight: 800; margin-bottom: 12px;">Configuration Saved!</div>
      
      <div style="text-align: left; font-size: 11px; color: var(--text-main); line-height: 1.5; background: white; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px;">
        <strong>Testing Cookie:</strong> <code>${keyVal}=${valVal}</code><br>
        <strong>DNS Parent Selector:</strong> <code>${dnsVal}</code><br>
        ${cssVal ? `<strong>DNS Custom CSS:</strong> <code>${cssVal}</code><br><br>` : '<br>'}
        <strong>Targeting KVPs Configured:</strong><br>
        <code style="word-break: break-all;">${targetVal}</code>
      </div>

      <button id="resultBackToMenuBtn" class="primary-btn" style="margin-top: 12px; background: var(--surface-card); border: 1px solid var(--border-color); color: var(--text-main); width: 100%;">
        ⬅️ Back to Settings
      </button>
    `);

    document.getElementById('resultBackToMenuBtn')?.addEventListener('click', () => showView('settingsView'));
  });
};