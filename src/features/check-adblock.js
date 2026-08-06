import { showView } from '../core/navigation.js';
import { updateStatus } from '../core/utils.js';

export const initCheckAdblock = () => {
  const runScan = async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) return;
    updateStatus("Scanning network...");

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => {
        return new Promise((resolve) => {
          const scriptExists = !!document.querySelector('script[src*="inside.js"]');
          
          const findMeasure = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            const paths = ['Mn', 'Rn', '_recorder'];
            for (const path of paths) {
              if (obj[path] && obj[path]['measure.detected']) {
                const val = obj[path]['measure.detected'].find(i => i !== null);
                if (val) return val;
              }
            }
            for (const key in obj) {
              if (obj[key] && typeof obj[key] === 'object' && obj[key]['measure.detected']) {
                const val = obj[key]['measure.detected'].find(i => i !== null);
                if (val) return val;
              }
            }
            return null;
          };

          const existing = findMeasure(window.admiral?.a);
          if (existing) return resolve({ data: existing });

          if (typeof window.admiral === 'function') {
            window.admiral('after', 'measure.detected', (d) => resolve({ data: d }));
            setTimeout(() => {
              resolve({ error: scriptExists ? 'Measurement timed out' : 'Measurement script blocked' });
            }, 5000);
          } else {
            resolve({ error: 'Admiral platform not detected' });
          }
        });
      }
    }, (results) => {
      const res = results[0]?.result;
      if (res && res.data) {
        const msg = res.data.adblocking 
          ? `<span style="color:#ef4444; font-weight:700;">Adblock Detected</span>` 
          : `<span style="color:#10b981; font-weight:700;">No Adblock Detected</span>`;
        const outputMsg = `
          ${msg}
          <button id="rescanAdblockBtn" class="primary-btn" style="margin-top: 12px;">
            🔄 Re-Scan Adblock Status
          </button>
        `;
        showView('result', outputMsg);
        document.getElementById('rescanAdblockBtn')?.addEventListener('click', runScan);
      } else {
        const errorMsg = `
          <span style="color:#64748b;">${res?.error || "Detection failed"}</span>
          <button id="rescanAdblockBtn" class="primary-btn" style="margin-top: 12px;">
            🔄 Re-Scan Adblock Status
          </button>
        `;
        showView('result', errorMsg);
        document.getElementById('rescanAdblockBtn')?.addEventListener('click', runScan);
      }
    });
  };

  document.getElementById('checkAdblock')?.addEventListener('click', runScan);
};