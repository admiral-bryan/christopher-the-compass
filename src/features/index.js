import { initStorageDefaults } from '../core/storage.js';
import { initNavigation } from '../core/navigation.js';

// Audit & Diagnostic Modules
import { initPropertyLink } from './property-link.js';
import { initCheckTargeting } from './check-targeting.js';
import { initCheckAdblock } from './check-adblock.js';
import { initCheckCandidate } from './check-candidate.js';
import { initCheckStrategy } from './check-strategy.js';
import { initCheckCmp } from './check-cmp.js';
import { initCountAds } from './count-ads.js';
import { initCheckAdTargeting } from './check-ad-targeting.js';
import { initCheckConsentSignals } from './check-consent-signals.js';

// Dev Tools & Utility Modules
import { initServingDomain } from './serving-domain.js';
import { initInjectDNS } from './inject-dns.js';
import { initTestCookie } from './test-cookie.js';
import { renderForceLoadUI } from './force-load.js';
import { initSettings, loadSettingsIntoUI } from './settings.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize storage defaults
  await initStorageDefaults();

  // 2. Bind global header navigation
  initNavigation((activePanelId) => {
    if (activePanelId === 'settingsView' || activePanelId === 'tab-settings') {
      loadSettingsIntoUI();
    }
  });

  // 3. Register all feature event listeners FIRST
  initPropertyLink();
  initCheckTargeting();
  initCheckAdblock();
  initCheckCandidate();
  initCheckStrategy();
  initCheckCmp();
  initCountAds();
  initCheckAdTargeting();
  initCheckConsentSignals();

  // 4. Register Dev Tools & Utility listeners
  initServingDomain();
  initInjectDNS();
  initTestCookie();
  renderForceLoadUI();
  initSettings();

  // 5. Load stored values into UI AFTER all listeners are attached
  await loadSettingsIntoUI();
});