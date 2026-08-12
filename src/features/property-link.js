import { showView } from '../core/navigation.js';
import { updateStatus, getActiveTab } from '../core/utils.js';

export const initPropertyLink = () => {
  const runScan = async () => {
    const tab = await getActiveTab();
    if (!tab) {
      updateStatus("No active browser tab detected.");
      return;
    }
    
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
      updateStatus("Cannot run diagnostics on restricted internal browser pages.");
      return;
    }

    updateStatus("Scanning for Property ID...");

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => {
        const visited = new WeakSet();

        const findPID = (obj) => {
          if (!obj || typeof obj !== 'object' || visited.has(obj)) return null;
          visited.add(obj);

          if (obj.propertyID && typeof obj.propertyID === 'string') {
            return obj.propertyID;
          }

          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              const res = findPID(obj[key]);
              if (res) return res;
            }
          }
          return null;
        };

        return findPID(window.admiral?.a) || findPID(window.admiral?.p);
      }
    }, (results) => {
      if (chrome.runtime.lastError) {
        updateStatus(`Access Error: ${chrome.runtime.lastError.message}`);
        return;
      }

      const pid = results?.[0]?.result;

      if (pid) {
        const pidParts = pid.split('-');
        if (pidParts.length > 1) {
          const oid = pidParts[1].toLowerCase();
          const targetUrl = `https://app.getadmiral.com/organization/${oid}/property/${pid}`;

          chrome.tabs.create({ url: targetUrl });

          const outputMsg = `
            Property ID: <strong>${pid}</strong><br>Management dashboard opened.
            <div style="margin-top: 14px; display: flex; gap: 8px; justify-content: center;">
              <button id="rescanPropertyBtn" class="primary-btn" style="margin: 0;">
                🔄 Re-Scan Property ID
              </button>
              <button id="resultBackToMenuBtn" class="primary-btn" style="margin: 0; background: var(--surface-card); border: 1px solid var(--border-color); color: var(--text-main);">
                ⬅️ Back to Menu
              </button>
            </div>
          `;

          showView('result', outputMsg);

          // Bind Re-Scan and Back button listeners safely
          document.getElementById('rescanPropertyBtn')?.addEventListener('click', runScan);
          document.getElementById('resultBackToMenuBtn')?.addEventListener('click', () => showView('menuView'));
        } else {
          updateStatus(`Invalid Property ID format detected: ${pid}`);
        }
      } else {
        updateStatus("Property ID not found on active page.");
      }
    });
  };

  document.getElementById('getLink')?.addEventListener('click', runScan);
};