import { showView } from '../core/navigation.js';
import { updateStatus } from '../core/utils.js';
import { DEFAULT_TARGETING_KEYS } from '../core/storage.js';

export const initCheckAdTargeting = () => {
  const runScan = async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.id) return;
    if (!tab) return;
    updateStatus("Scanning ad request targeting KVPs...");

    const store = await chrome.storage.local.get(['targetingKeys']);
    const rawTargetingConfig = store.targetingKeys || DEFAULT_TARGETING_KEYS;

    const rules = rawTargetingConfig.split(',').map(s => s.trim()).filter(Boolean).map(item => {
      if (item.includes('=')) {
        const parts = item.split('=');
        return { raw: item, key: parts[0].trim(), expectedVal: parts.slice(1).join('=').trim() };
      }
      return { raw: item, key: item, expectedVal: null };
    });

    const uniqueKeysToScan = Array.from(new Set(rules.map(r => r.key)));

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: (keysToScan) => {
        const detectedKvps = {};
        keysToScan.forEach(k => { detectedKvps[k] = null; });

        const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        if (window.googletag && window.googletag.apiReady) {
          try {
            const pubads = window.googletag.pubads();
            const pageKeys = pubads.getTargetingKeys();
            pageKeys.forEach(key => {
              if (keysToScan.includes(key)) {
                detectedKvps[key] = pubads.getTargeting(key);
              }
            });

            const slots = pubads.getSlots();
            slots.forEach(slot => {
              const slotKeys = slot.getTargetingKeys();
              slotKeys.forEach(key => {
                if (keysToScan.includes(key) && !detectedKvps[key]) {
                  detectedKvps[key] = slot.getTargeting(key);
                }
              });
            });
          } catch (e) {}
        }

        try {
          const resources = performance.getEntriesByType('resource');
          const gampadRequests = resources.filter(r => r.name.includes('doubleclick.net/gampad/ads') || r.name.includes('googlesyndication.com'));

          gampadRequests.forEach(req => {
            let urlStr = req.name;
            try {
              urlStr = decodeURIComponent(decodeURIComponent(req.name));
            } catch (e) {
              try { urlStr = decodeURIComponent(req.name); } catch (e2) {}
            }

            keysToScan.forEach(key => {
              if (!detectedKvps[key] && urlStr.includes(key)) {
                const safeKey = escapeRegExp(key);
                const match = urlStr.match(new RegExp(`${safeKey}[=|=]([^&;]+)`));
                detectedKvps[key] = match ? match[1] : true;
              }
            });
          });
        } catch (e) {}

        return detectedKvps;
      },
      args: [uniqueKeysToScan]
    }, (results) => {
      const kvpData = results[0]?.result || {};

      let listHTML = '';
      rules.forEach(rule => {
        const rawVal = kvpData[rule.key];
        const isSet = rawVal !== null && rawVal !== undefined;

        let badgeHTML = '';

        if (isSet) {
          const displayValStr = Array.isArray(rawVal) ? rawVal.join(', ') : String(rawVal);
          
          if (rule.expectedVal !== null) {
            const matches = Array.isArray(rawVal) 
              ? rawVal.map(String).includes(rule.expectedVal) 
              : String(rawVal) === rule.expectedVal;

            if (matches) {
              badgeHTML = `<span style="color: var(--emerald-accent); font-weight: 700;">Set (${displayValStr}) ✓</span>`;
            } else {
              badgeHTML = `<span style="color: #d97706; font-weight: 700;">Set (${displayValStr}) [Exp: ${rule.expectedVal}]</span>`;
            }
          } else {
            badgeHTML = `<span style="color: var(--emerald-accent); font-weight: 700;">Set (${displayValStr})</span>`;
          }
        } else {
          badgeHTML = `<span style="color: var(--text-muted);">Not Detected</span>`;
        }

        listHTML += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid var(--border-color); font-size: 10.5px;">
            <span style="font-weight: 600; color: var(--text-main);">${rule.raw}</span>
            ${badgeHTML}
          </div>
        `;
      });

      const outputHTML = `
        <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 8px; border-bottom: 1px solid var(--border-color); padding-bottom: 4px; text-align: left;">
          Ad Request Targeting KVPs
        </div>
        <div style="text-align: left; background: white; border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 8px; margin-bottom: 8px;">
          ${listHTML}
        </div>
        <button id="rescanAdTargetingBtn" class="primary-btn" style="margin-top: 4px;">
          🔄 Re-Scan Targeting KVPs
        </button>
      `;

      showView('result', outputHTML);
      document.getElementById('rescanAdTargetingBtn')?.addEventListener('click', runScan);
    });
  };

  document.getElementById('checkAdTargetingBtn')?.addEventListener('click', runScan);
};