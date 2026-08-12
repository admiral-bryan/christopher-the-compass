import { showView } from '../core/navigation.js';
import { updateStatus, getActiveTab } from '../core/utils.js';
import { DEFAULT_DNS_SELECTOR, DEFAULT_DNS_CUSTOM_CSS } from '../core/storage.js';

export const initInjectDNS = () => {
  document.getElementById('injectDnsBtn')?.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab) {
      updateStatus("No active webpage tab detected.");
      return;
    }

    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
      updateStatus("Cannot inject element on restricted browser pages.");
      return;
    }

    // Read configured selector and custom CSS from storage
    const store = await chrome.storage.local.get(['dnsSelector', 'dnsCustomCss']);
    const rawSelector = (store.dnsSelector || DEFAULT_DNS_SELECTOR).trim();
    const customCss = (store.dnsCustomCss || DEFAULT_DNS_CUSTOM_CSS).trim();

    updateStatus(`Locating target for selector "${rawSelector}"...`);

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: (userSelector, userCss) => {
        let cleanSelector = userSelector.trim().replace(/^\.+/, '.');
        
        const candidateSelectors = [
          cleanSelector,
          userSelector.trim(),
          `.${cleanSelector.replace(/^[.#]/, '')}`,
          `#${cleanSelector.replace(/^[.#]/, '')}`,
          'footer',
          '[class*="footer"]',
          '[id*="footer"]',
          'body'
        ];

        let targetElement = null;
        let matchedSelector = null;

        for (const sel of candidateSelectors) {
          try {
            if (!sel) continue;
            const el = document.querySelector(sel);
            if (el) {
              targetElement = el;
              matchedSelector = sel;
              break;
            }
          } catch (e) {}
        }

        if (!targetElement) {
          return { 
            success: false, 
            reason: `Target element "${userSelector}" was not found on this page.` 
          };
        }

        let link = document.getElementById('compass-dns-link');
        let isUpdate = false;

        if (!link) {
          link = document.createElement('a');
          link.id = 'compass-dns-link';
          link.href = '#';
          link.innerText = 'Do Not Sell My Personal Information';

          link.onclick = (e) => {
            e.preventDefault();
            if (typeof window.__gpp === 'function') {
              window.__gpp('openConsentManager');
            } else if (typeof window.__tcfapi === 'function') {
              window.__tcfapi('displayConsentUi', 2, () => {});
            } else {
              alert('Do Not Sell Link Clicked');
            }
          };

          targetElement.appendChild(link);
        } else {
          isUpdate = true;
        }

        const baseStyle = 'margin: 8px; cursor: pointer; text-decoration: underline; display: inline-block; font-weight: 600; font-size: 12px;';
        link.style.cssText = userCss ? `${baseStyle} ${userCss}` : baseStyle;

        link.scrollIntoView({ behavior: 'smooth', block: 'center' });

        return { success: true, matchedSelector, isUpdate };
      },
      args: [rawSelector, customCss]
    }, (results) => {
      if (chrome.runtime.lastError) {
        updateStatus(`Injection Error: ${chrome.runtime.lastError.message}`);
        return;
      }

      const res = results?.[0]?.result;

      if (res?.success) {
        const targetDesc = res.matchedSelector || rawSelector;
        const statusTitle = res.isUpdate ? 'Styles Updated on Link' : 'Injected "Do Not Sell My Personal Information"';

        showView('result', `
          <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 6px;">DNS Link Injector</div>
          <div style="font-size: 13px; color: var(--emerald-accent); font-weight: 700; margin-bottom: 8px;">
            ${statusTitle} inside <code>${targetDesc}</code>
          </div>
          ${customCss ? `<div style="font-size: 10.5px; color: var(--text-main); margin-bottom: 8px;">Applied Custom CSS: <code>${customCss}</code></div>` : ''}
          <button id="resultBackToMenuBtn" class="primary-btn" style="margin-top: 12px; background: var(--surface-card); border: 1px solid var(--border-color); color: var(--text-main); width: 100%;">
            ⬅️ Back to Dev Tools
          </button>
        `);

        document.getElementById('resultBackToMenuBtn')?.addEventListener('click', () => showView('devToolsView'));
      } else {
        updateStatus(res?.reason || "Failed to inject Do Not Sell link.");
      }
    });
  });
};