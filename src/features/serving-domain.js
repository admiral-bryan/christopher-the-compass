import { showView } from '../core/navigation.js';
import { updateStatus, getActiveTab } from '../core/utils.js';

export const initServingDomain = () => {
  const runScan = async () => {
    const tab = await getActiveTab();
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
      updateStatus("Cannot inspect serving domain on restricted browser pages.");
      return;
    }

    updateStatus("Detecting Admiral Serving Domain...");

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => {
        const detectedDomains = new Set();

        // 1. Scan script tags for getadmiral.com or forced scripts
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        scripts.forEach(s => {
          if (s.src.includes('getadmiral.com') || s.getAttribute('data-forced-by')) {
            try { detectedDomains.add(new URL(s.src).hostname); } catch(e) {}
          }
        });

        // 2. Scan window.admiral internal objects (e.g. window.admiral.a / window.admiral.p)
        const scanObjForUrls = (obj, depth = 0) => {
          if (!obj || typeof obj !== 'object' || depth > 3) return;
          for (const key in obj) {
            try {
              const val = obj[key];
              if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) {
                detectedDomains.add(new URL(val).hostname);
              } else if (typeof val === 'object' && val !== null) {
                // Look inside map keys (like { "https://dualping.com/...": true })
                Object.keys(val).forEach(k => {
                  if (k.startsWith('http://') || k.startsWith('https://')) {
                    detectedDomains.add(new URL(k).hostname);
                  }
                });
                scanObjForUrls(val, depth + 1);
              }
            } catch(e) {}
          }
        };

        if (window.admiral) {
          scanObjForUrls(window.admiral.a || window.admiral.p || window.admiral);
        }

        // 3. Fallback: Check performance timeline for polymorphic script requests
        if (detectedDomains.size === 0 && window.performance) {
          const resources = performance.getEntriesByType('resource');
          resources.forEach(r => {
            if (r.name.includes('/dist/') || r.name.includes('admiral')) {
              try { detectedDomains.add(new URL(r.name).hostname); } catch(e) {}
            }
          });
        }

        return Array.from(detectedDomains);
      }
    }, async (results) => {
      if (chrome.runtime.lastError) {
        updateStatus(`Access Error: ${chrome.runtime.lastError.message}`);
        return;
      }

      const domains = results?.[0]?.result || [];
      const primaryDomain = domains[0];

      if (!primaryDomain) {
        updateStatus("Admiral serving domain not detected on active page.");
        return;
      }

      const sessionKey = `blockedDomain_${tab.id}`;
      const store = await chrome.storage.session.get([sessionKey]);
      const isBlocked = !!store[sessionKey];

      renderResult(primaryDomain, isBlocked, tab.id);
    });
  };

  document.getElementById('getServingDomainBtn')?.addEventListener('click', runScan);
};

const renderResult = (domain, isBlocked, tabId) => {
  const html = `
    <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 6px;">Configured Serving Domain</div>
    <div style="font-size: 15px; color: var(--emerald-accent); font-weight: 800; margin-bottom: 12px; word-break: break-all;">${domain}</div>
    
    ${isBlocked ? `
      <div style="padding: 8px; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 6px; font-size: 11px; color: #ef4444; margin-bottom: 12px; text-align: left;">
        🛑 Requests to <strong>${domain}</strong> are currently BLOCKED for this session.
      </div>
      <button id="toggleBlockBtn" class="primary-btn" style="background: var(--surface-card); border: 1px solid var(--border-color); color: var(--text-main); width: 100%;">
        ▶️ End Session (Unblock Requests)
      </button>
    ` : `
      <button id="toggleBlockBtn" class="primary-btn" style="background: #ef4444; color: #fff; width: 100%;">
        🚫 Block Requests From This Domain
      </button>
    `}

    <button id="resultBackToMenuBtn" class="primary-btn" style="margin-top: 8px; background: var(--surface-card); border: 1px solid var(--border-color); color: var(--text-main); width: 100%;">
      ⬅️ Back to Dev Tools
    </button>
  `;

  showView('result', html);

  document.getElementById('resultBackToMenuBtn')?.addEventListener('click', () => showView('devToolsView'));

  document.getElementById('toggleBlockBtn')?.addEventListener('click', async () => {
    const action = isBlocked ? 'unblockServingDomain' : 'blockServingDomain';
    
    chrome.runtime.sendMessage({ action, domain }, async (res) => {
      if (res?.success) {
        const sessionKey = `blockedDomain_${tabId}`;
        if (isBlocked) {
          await chrome.storage.session.remove([sessionKey]);
        } else {
          await chrome.storage.session.set({ [sessionKey]: domain });
        }
        renderResult(domain, !isBlocked, tabId);
      } else {
        updateStatus(`Failed to update blocking rule: ${res?.error || 'Unknown error'}`);
      }
    });
  });
};