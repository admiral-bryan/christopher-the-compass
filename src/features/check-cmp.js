import { showView } from '../core/navigation.js';
import { updateStatus } from '../core/utils.js';

export const initCheckCmp = () => {
  const runScan = async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) return;
    updateStatus("Querying CMP APIs...");

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => {
        return new Promise((resolve) => {
          const results = {
            gpp: { detected: false, provider: null, cmpId: null },
            tcf: { detected: false, provider: null, cmpId: null }
          };

          const checkGPP = () => {
            return new Promise((res) => {
              if (typeof window.__gpp === 'function') {
                results.gpp.detected = true;
                try {
                  window.__gpp('ping', (data) => {
                    if (data && data.cmpId !== undefined) {
                      results.gpp.cmpId = data.cmpId;
                      results.gpp.provider = data.cmpId === 9 ? "Admiral" : `Third-Party (ID: ${data.cmpId})`;
                    } else {
                      results.gpp.provider = "Unknown";
                    }
                    res();
                  });
                  setTimeout(res, 2000);
                } catch (e) {
                  results.gpp.provider = "Error querying GPP";
                  res();
                }
              } else res();
            });
          };

          const checkTCF = () => {
            return new Promise((res) => {
              if (typeof window.__tcfapi === 'function') {
                results.tcf.detected = true;
                try {
                  window.__tcfapi('getTCData', 2, (data, success) => {
                    if (success && data && data.cmpId !== undefined) {
                      results.tcf.cmpId = data.cmpId;
                      results.tcf.provider = data.cmpId === 9 ? "Admiral" : `Third-Party (ID: ${data.cmpId})`;
                    } else {
                      results.tcf.provider = "Unknown (No TCData)";
                    }
                    res();
                  });
                  setTimeout(res, 2000);
                } catch (e) {
                  results.tcf.provider = "Error querying TCF";
                  res();
                }
              } else res();
            });
          };

          Promise.all([checkGPP(), checkTCF()]).then(() => resolve(results));
        });
      }
    }, (results) => {
      const data = results[0]?.result;
      if (data) {
        const gppStatus = data.gpp.detected 
          ? `<span style="color:var(--emerald-accent); font-weight:700;">Detected</span><br><span style="font-size:10px; color:var(--text-muted); font-weight:500;">(${data.gpp.provider})</span>` 
          : `<span style="color:var(--text-muted);">Not Found</span>`;

        const tcfStatus = data.tcf.detected 
          ? `<span style="color:var(--emerald-accent); font-weight:700;">Detected</span><br><span style="font-size:10px; color:var(--text-muted); font-weight:500;">(${data.tcf.provider})</span>` 
          : `<span style="color:var(--text-muted);">Not Found</span>`;

        const outputMsg = `
          <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 12px; border-bottom:1px solid var(--border-color); padding-bottom:6px;">Consent API Status</div>
          <div style="text-align: left; margin: 0 auto; width: 190px; font-size: 11px; line-height: 2;">
            <strong>GPP API:</strong> ${gppStatus}<br>
            <strong>TCF API:</strong> ${tcfStatus}
          </div>
          <button id="rescanCmpBtn" class="primary-btn" style="margin-top: 12px;">
            🔄 Re-Scan Consent Frameworks
          </button>
        `;
        showView('result', outputMsg);
        document.getElementById('rescanCmpBtn')?.addEventListener('click', runScan);
      } else {
        updateStatus("CMP checks could not execute.");
      }
    });
  };

  document.getElementById('checkCmp')?.addEventListener('click', runScan);
};