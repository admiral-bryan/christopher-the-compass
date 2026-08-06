import { showView } from '../core/navigation.js';
import { updateStatus, getActiveTab } from '../core/utils.js';

export const initPropertyLink = () => {
  const runScan = async () => {
    // 1. Resolve active webpage tab cleanly
    const tab = await getActiveTab();
    if (!tab) {
      updateStatus("No active browser tab detected.");
      return;
    }
    
    // 2. Guard restricted internal browser pages
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

          // Direct property check
          if (obj.propertyID && typeof obj.propertyID === 'string') {
            return obj.propertyID;
          }

          // Safe bounded traversal
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              const res = findPID(obj[key]);
              if (res) return res;
            }
          }
          return null;
        };

        // Check both window.admiral.a and window.admiral.p instances
        return findPID(window.admiral?.a) || findPID(window.admiral?.p);
      }
    }, (results) => {
      // 3. Catch permission or scripting restrictions gracefully
      if (chrome.runtime.lastError) {
        updateStatus(`Access Error: ${chrome.runtime.lastError.message}`);
        return;
      }

      // 4. Safe optional array chaining
      const pid = results?.[0]?.result;

      if (pid) {
        const pidParts = pid.split('-');
        if (pidParts.length > 1) {
          const oid = pidParts[1].toLowerCase();
          const targetUrl = `https://app.getadmiral.com/organization/${oid}/property/${pid}`;

          // ✅ FIX: Use chrome.tabs.create instead of window.open in Side Panel
          chrome.tabs.create({ url: targetUrl });

          const outputMsg = `
            Property ID: <strong>${pid}</strong><br>Management dashboard opened.
            <button id="rescanPropertyBtn" class="primary-btn" style="margin-top: 12px;">
              🔄 Re-Scan Property ID
            </button>
          `;
          showView('result', outputMsg);
          document.getElementById('rescanPropertyBtn')?.addEventListener('click', runScan);
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