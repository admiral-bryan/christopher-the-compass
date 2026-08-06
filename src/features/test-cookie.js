import { showView } from '../core/navigation.js';
import { updateStatus, getRootDomain } from '../core/utils.js';
import { DEFAULT_COOKIE_KEY, DEFAULT_COOKIE_VAL } from '../core/storage.js';

export const initTestCookie = () => {
  document.getElementById('setCookieBtn')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
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
        url: tab.url,
        name: cookieKey,
        value: cookieVal,
        domain: `.${rootDomain}`,
        path: '/',
        secure: urlObj.protocol === 'https:'
      };

      chrome.cookies.set(cookieDetails, (cookie) => {
        if (chrome.runtime.lastError) {
          updateStatus(`Cookie Error: ${chrome.runtime.lastError.message}`);
          return;
        }

        showView('result', `
          <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 6px;">Cookie Applied</div>
          <div style="font-size: 15px; color: var(--emerald-accent); font-weight: 800; margin-bottom: 6px;">${cookieKey}=${cookieVal}</div>
          <div style="font-size: 10.5px; color: var(--text-main); line-height: 1.4;">
            Domain Scope:<br><strong>.${rootDomain}</strong><br><br>
            <small style="color: var(--text-muted);">Available on all subdomains and paths across this site.</small>
          </div>
        `);
      });

    } catch (err) {
      updateStatus(`Failed to set cookie: ${err.message}`);
    }
  });
};