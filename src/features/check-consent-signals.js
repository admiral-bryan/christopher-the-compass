import { showView } from '../core/navigation.js';
import { updateStatus } from '../core/utils.js';

export const initCheckConsentSignals = () => {
  const runScan = async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) return;
    updateStatus("Scanning ad request consent signals...");

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => {
        const signals = {
          gdpr: { key: 'gdpr', val: null },
          gdpr_consent: { key: 'gdpr_consent', val: null },
          addtl_consent: { key: 'addtl_consent', val: null },
          gpp: { key: 'gpp', val: null },
          gpp_sid: { key: 'gpp_sid', val: null }
        };

        const targetKeys = Object.keys(signals);

        if (window.googletag && window.googletag.apiReady) {
          try {
            const pubads = window.googletag.pubads();
            const pageKeys = pubads.getTargetingKeys();
            pageKeys.forEach(key => {
              const lowerKey = key.toLowerCase();
              if (signals[lowerKey] && signals[lowerKey].val === null) {
                signals[lowerKey].val = pubads.getTargeting(key);
              }
            });
          } catch (e) {}
        }

        try {
          const resources = performance.getEntriesByType('resource');
          const adRequests = resources.filter(r => 
            r.name.includes('doubleclick.net/gampad/ads') || 
            r.name.includes('googlesyndication.com') ||
            r.name.includes('securepubads')
          );

          adRequests.forEach(req => {
            let urlStr = req.name;
            try {
              urlStr = decodeURIComponent(decodeURIComponent(req.name));
            } catch (e) {
              try { urlStr = decodeURIComponent(req.name); } catch (e2) {}
            }

            targetKeys.forEach(key => {
              if (signals[key].val === null && urlStr.includes(key)) {
                const match = urlStr.match(new RegExp(`[?&;]${key}=([^&;]+)`, 'i'));
                if (match && match[1]) {
                  signals[key].val = match[1];
                }
              }
            });
          });
        } catch (e) {}

        return signals;
      }
    }, (results) => {
      const data = results[0]?.result || {};

      const translateGppSid = (rawSid) => {
        if (rawSid === null || rawSid === undefined) return null;
        
        const sidMap = {
          '2': '2 (TCF EU)',
          '6': '6 (US National)',
          '7': '7 (US California)',
          '8': '8 (US Virginia)',
          '9': '9 (US Colorado)',
          '10': '10 (US Utah)',
          '11': '11 (US Connecticut)',
          '-1': 'None (-1)'
        };

        const rawStr = Array.isArray(rawSid) ? rawSid.join(',') : String(rawSid);
        const parts = rawStr.split(/[,_%2C]/).map(s => s.trim()).filter(Boolean);
        const translatedParts = parts.map(p => sidMap[p] || p);
        return translatedParts.join(', ');
      };

      const translateGdprApplies = (rawGdpr) => {
        if (rawGdpr === null || rawGdpr === undefined) return null;
        const strVal = String(rawGdpr).trim();
        if (strVal === '1' || strVal.toLowerCase() === 'true') return 'True';
        if (strVal === '0' || strVal.toLowerCase() === 'false') return 'False';
        return strVal;
      };

      const renderSignalValue = (rawVal, isDecodableIabString = false) => {
        if (rawVal === null || rawVal === undefined) {
          return `<span style="color: var(--text-muted);">Not Detected</span>`;
        }

        const displayVal = Array.isArray(rawVal) ? rawVal.join(', ') : String(rawVal);
        const shortVal = displayVal.length > 20 ? `${displayVal.substring(0, 17)}...` : displayVal;

        const decoderLink = isDecodableIabString 
          ? `<a href="https://iabgpp.com/#${encodeURIComponent(displayVal)}" target="_blank" style="color: var(--blue-accent); font-size: 9px; margin-left: 4px; text-decoration: none;" title="Inspect in IAB GPP Decoder">↗ Decode</a>`
          : '';

        return `
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="color: var(--emerald-accent); font-weight: 700;" title="${escapeAttr(displayVal)}">
              ${escapeHtml(shortVal)}
            </span>
            ${decoderLink}
          </div>
        `;
      };

      const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const escapeAttr = (str) => str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');

      const gdprAppliesDisplay = translateGdprApplies(data.gdpr.val);
      const gppSidDisplay = translateGppSid(data.gpp_sid.val);

      const gdprHTML = `
        <div style="font-size: 10px; text-transform: uppercase; color: var(--navy-dark); font-weight: 800; margin-bottom: 6px; padding-bottom: 2px; border-bottom: 1px solid var(--border-color);">
          GDPR &amp; TCF Signals
        </div>
        <div style="text-align: left; background: white; border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 8px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--border-color); font-size: 10.5px;">
            <span style="font-weight: 600;">GDPR Applies:</span> ${renderSignalValue(gdprAppliesDisplay, false)}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--border-color); font-size: 10.5px;">
            <span style="font-weight: 600;">TCF Consent:</span> ${renderSignalValue(data.gdpr_consent.val, true)}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 10.5px;">
            <span style="font-weight: 600;">Additional Consent:</span> ${renderSignalValue(data.addtl_consent.val, false)}
          </div>
        </div>
      `;

      const gppHTML = `
        <div style="font-size: 10px; text-transform: uppercase; color: var(--navy-dark); font-weight: 800; margin-bottom: 6px; padding-bottom: 2px; border-bottom: 1px solid var(--border-color);">
          Global Privacy Platform (GPP)
        </div>
        <div style="text-align: left; background: white; border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 8px; margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--border-color); font-size: 10.5px;">
            <span style="font-weight: 600;">GPP String:</span> ${renderSignalValue(data.gpp.val, true)}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 10.5px;">
            <span style="font-weight: 600;">GPP Section IDs:</span> ${renderSignalValue(gppSidDisplay, false)}
          </div>
        </div>
      `;

      const outputHTML = `
        <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 8px;">
          Ad Request Consent Signals
        </div>
        ${gdprHTML}
        ${gppHTML}
        <button id="rescanConsentSignalsBtn" class="primary-btn" style="margin-top: 4px;">
          🔄 Re-Scan Consent Signals
        </button>
      `;

      showView('result', outputHTML);
      document.getElementById('rescanConsentSignalsBtn')?.addEventListener('click', runScan);
    });
  };

  document.getElementById('checkConsentSignalsBtn')?.addEventListener('click', runScan);
};