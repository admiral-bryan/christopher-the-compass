import { showView, renderObjectCardView, bindJsonToggle } from '../core/navigation.js';
import { updateStatus, getActiveTab } from '../core/utils.js';

export const initCheckCandidate = () => {
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

    updateStatus("Monitoring...");

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => {
        return new Promise((resolve) => {
          const findCand = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            if (Array.isArray(obj['candidate.shown'])) return obj['candidate.shown'].find(i => i !== null);
            for (const key in obj) {
              const res = findCand(obj[key]);
              if (res) return res;
            }
            return null;
          };
          const existing = findCand(window.admiral?.a);
          if (existing) return resolve(existing);
          if (typeof window.admiral === 'function') {
            window.admiral('after', 'candidate.shown', (d) => resolve(d));
            setTimeout(() => resolve({ error: 'No active candidate' }), 4000);
          } else resolve({ error: 'Admiral not detected' });
        });
      }
    }, (results) => {
      if (chrome.runtime.lastError) {
        updateStatus(`Scan Error: ${chrome.runtime.lastError.message}`);
        return;
      }

      const res = results?.[0]?.result;
      if (res && !res.error) {
        const cleanCandidate = {
          candidateID: res.candidateID,
          variantID: res.variantID || "None",
          groups: Array.isArray(res.candidateGroups) ? res.candidateGroups : (res.groups || "None")
        };
        let html = renderObjectCardView("Active Journey Candidate", cleanCandidate, res);
        html += `
          <button id="rescanCandidateBtn" class="primary-btn" style="margin-top: 8px;">
            🔄 Re-Scan Candidate Data
          </button>
        `;
        showView('result', html);
        bindJsonToggle();
        document.getElementById('rescanCandidateBtn')?.addEventListener('click', runScan);
      } else {
        updateStatus(res?.error || "No candidate found.");
      }
    });
  };

  document.getElementById('checkCandidate')?.addEventListener('click', runScan);
};