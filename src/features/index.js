import { initStorageDefaults } from '../core/storage.js';
import { initNavigation } from '../core/navigation.js';

import { initPropertyLink } from './property-link.js';
import { initCheckTargeting } from './check-targeting.js';
import { initCheckAdblock } from './check-adblock.js';
import { initCheckCandidate } from './check-candidate.js';
import { initCheckStrategy } from './check-strategy.js';
import { initCheckCmp } from './check-cmp.js';
import { initCountAds } from './count-ads.js';
import { initCheckAdTargeting } from './check-ad-targeting.js';
import { initCheckConsentSignals } from './check-consent-signals.js';

import { initTestCookie } from './test-cookie.js';
import { renderForceLoadUI } from './force-load.js';
import { initSettings, loadSettingsIntoUI } from './settings.js';

document.addEventListener('DOMContentLoaded', async () => {
  await initStorageDefaults();

  initNavigation((activePanelId) => {
    if (activePanelId === 'tab-settings') {
      loadSettingsIntoUI();
    }
  });

  initPropertyLink();
  initCheckTargeting();
  initCheckAdblock();
  initCheckCandidate();
  initCheckStrategy();
  initCheckCmp();
  initCountAds();
  initCheckAdTargeting();
  initCheckConsentSignals();

  initTestCookie();
  renderForceLoadUI();
  initSettings();
});