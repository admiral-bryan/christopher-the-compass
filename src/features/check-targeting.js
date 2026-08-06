import { showView, renderObjectCardView, bindJsonToggle } from '../core/navigation.js';
import { updateStatus, getActiveTab } from '../core/utils.js';

export const initCheckTargeting = () => {
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

    updateStatus("Scanning visitor targeting criteria...");

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => {
        const findTarget = (obj) => {
          if (!obj || typeof obj !== 'object') return null;
          if (obj['targeting.ready'] && Array.isArray(obj['targeting.ready'])) {
            return obj['targeting.ready'].find(i => i !== null && typeof i === 'object');
          }
          for (const key in obj) {
            const res = findTarget(obj[key]);
            if (res) return res;
          }
          return null;
        };
        return findTarget(window.admiral?.a);
      }
    }, (results) => {
      if (chrome.runtime.lastError) {
        updateStatus(`Scan Error: ${chrome.runtime.lastError.message}`);
        return;
      }

      const data = results?.[0]?.result;
      if (data) {
        let html = renderObjectCardView("Visitor Targeting Criteria", data, data);
        html += `
          <button id="rescanTargetingBtn" class="primary-btn" style="margin-top: 8px;">
            🔄 Re-Scan Targeting Criteria
          </button>
        `;
        showView('result', html);
        bindJsonToggle();
        document.getElementById('rescanTargetingBtn')?.addEventListener('click', runScan);
      } else {
        updateStatus("No targeting criteria found.");
      }
    });
  };

  document.getElementById('checkTargeting')?.addEventListener('click', runScan);
};