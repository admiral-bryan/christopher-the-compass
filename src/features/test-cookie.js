import { showView } from '../core/navigation.js';
import { updateStatus, getRootDomain, getActiveTab } from '../core/utils.js';
import { DEFAULT_COOKIE_KEY, DEFAULT_COOKIE_VAL } from '../core/storage.js';

export const initTestCookie = () => {
  const cookieBtn = document.getElementById('setCookieBtn');

  // Check tab state on view initialization and guard Incognito mode
  const checkIncognitoState = async () => {
    const tab = await getActiveTab();
    if (tab?.incognito && cookieBtn) {
      cookieBtn.disabled = true;
      cookieBtn.style.opacity = '0.5';
      cookieBtn.style.cursor = 'not-allowed';
      cookieBtn.title = "does not work in incognito";

      // Attach a subtle helper text if not already rendered
      if (!document.getElementById('incognitoCookieWarning') && cookieBtn.parentElement) {
        const cue = document.createElement('div');
        cue.id = 'incognitoCookieWarning';
        cue.style.cssText = 'font-size: 10px; color: #f59e0b; margin-top: 6px; font-weight: 600; text-align: center;';
        cue.innerText = '⚠️ Test cookies are disabled in Incognito mode.';
        cookieBtn.parentElement.appendChild(cue);
      }
    }
  };

  // Run initial state check
  checkIncognitoState();

  cookieBtn?.addEventListener('click', async () => {
    // 1. Resolve active webpage tab cleanly
    const tab = await getActiveTab();

    // Guard Incognito execution
    if (tab?.incognito) {
      updateStatus("Set Test Cookie does not work in Incognito mode.");
      return;
    }

    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://')) {
      updateStatus("Cannot set cookie on a restricted browser page.");
      return;
    }

    const store = await chrome.storage.local.get(['cookieKey', 'cookieVal']);
    const cookieKey = store.cookieKey || DEFAULT_COOKIE_KEY;
    const cookieVal = store.cookieVal || DEFAULT_COOKIE_VAL;

    try {
      const urlObj = new URL(tab.url);
      const rootDomain = getRootDomain(urlObj.hostname);

      const cookieDetails = {
        url: `${urlObj.protocol}//${urlObj.hostname}/`,
        name: cookieKey,
        value: cookieVal,
        domain: `.${rootDomain}`,
        path: '/',
        secure: urlObj.protocol === 'https:'
      };

      chrome.cookies.set(cookieDetails, (cookie) => {
        if (chrome.runtime.lastError) {
          // Retry setting host-only cookie without explicit domain parameter as fallback
          delete cookieDetails.domain;
          chrome.cookies.set(cookieDetails, (fallbackCookie) => {
            if (chrome.runtime.lastError) {
              updateStatus(`Cookie Error: ${chrome.runtime.lastError.message}`);
              return;
            }
            renderSuccess(cookieKey, cookieVal, rootDomain, false);
          });
          return;
        }

        renderSuccess(cookieKey, cookieVal, rootDomain, false);
      });

    } catch (err) {
      updateStatus(`Failed to set cookie: ${err.message}`);
    }
  });
};

const renderSuccess = (key, val, domain, isIncognito) => {
  showView('result', `
    <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 6px;">Cookie Applied</div>
    <div style="font-size: 15px; color: var(--emerald-accent); font-weight: 800; margin-bottom: 6px;">${key}=${val}</div>
    <div style="font-size: 10.5px; color: var(--text-main); line-height: 1.4;">
      Domain Scope:<br><strong>.${domain}</strong><br><br>
      <small style="color: var(--text-muted);">Available across all paths.</small>
    </div>
  `);
};