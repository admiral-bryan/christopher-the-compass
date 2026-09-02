import { showView } from '../core/navigation.js';
import { updateStatus, getActiveTab } from '../core/utils.js';

export const initCheckClientProtect = () => {
  document.getElementById('checkClientProtectBtn')?.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
      updateStatus("Cannot run Client Protect audit on restricted pages.");
      return;
    }

    updateStatus("Auditing Client Protect configuration...");

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => {
        let isDetected = false;
        const indicators = [];

        // 1. Check runtime failsafe flag set by Client Protect tags
        if (window._afsr === true) {
          isDetected = true;
          indicators.push("Runtime failsafe flag (window._afsr) is active");
        }

        // 2. Scan inline script tags for structural Client Protect signatures
        const scriptElements = Array.from(document.querySelectorAll('script:not([src])'));
        
        for (const script of scriptElements) {
          const text = script.textContent || script.innerText || "";

          // Signature A: Bitwise feature flag present in stub (s=1+128 or bitmask flags > 0)
          const hasBitwiseFlag = /s\s*=\s*1\s*\+\s*128/.test(text);

          // Signature B: Embedded purpose:failsafe payload or URL-encoded failsafe trigger
          const hasFailsafePurpose = text.includes("purpose:failsafe") || text.includes("%22purpose:failsafe%22");

          // Signature C: Invariant infrastructure URLs (instructions/payback links)
          const hasInfraUrls = text.includes("getadmiral.com/instructions") || 
                               text.includes("%6d%79.%67%65tadmir%61l.com/instructions") ||
                               text.includes("getadmiral.com/pb/");

          if (hasBitwiseFlag || hasFailsafePurpose || hasInfraUrls) {
            isDetected = true;
            if (hasBitwiseFlag && !indicators.includes("Client Protect bitwise flag (s=1+128) in stub")) {
              indicators.push("Client Protect bitwise flag (s=1+128) in stub");
            }
            if (hasFailsafePurpose && !indicators.includes("Embedded purpose:failsafe payload")) {
              indicators.push("Embedded purpose:failsafe payload");
            }
            if (hasInfraUrls && !indicators.includes("Failsafe infrastructure recovery URLs")) {
              indicators.push("Failsafe infrastructure recovery URLs");
            }
          }
        }

        // 3. Fallback: Check if the failsafe DOM modal is currently rendered on screen
        const failsafeModal = document.querySelector('.DCDOr, [data-pr0daej3gx]');
        if (failsafeModal) {
          isDetected = true;
          indicators.push("Failsafe overlay container is actively rendered on DOM");
        }

        return {
          isDetected,
          indicators,
          scriptCount: scriptElements.length
        };
      }
    }, (results) => {
      if (chrome.runtime.lastError) {
        updateStatus(`Audit Error: ${chrome.runtime.lastError.message}`);
        return;
      }

      const res = results?.[0]?.result;

      if (!res) {
        updateStatus("Failed to analyze Client Protect configuration.");
        return;
      }

      renderResult(res);
    });
  });
};

const renderResult = ({ isDetected, indicators }) => {
  const statusColor = isDetected ? "var(--emerald-accent)" : "#64748b";
  const badgeBg = isDetected ? "rgba(16, 185, 129, 0.1)" : "rgba(100, 116, 139, 0.1)";
  const badgeBorder = isDetected ? "#10b981" : "#cbd5e1";
  const titleText = isDetected ? "Client Protect Configured" : "Standard Admiral Tag Detected";

  const html = `
    <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 6px;">Client Protect Audit</div>
    
    <div style="padding: 10px; background: ${badgeBg}; border: 1px solid ${badgeBorder}; border-radius: 6px; margin-bottom: 12px; text-align: left;">
      <div style="font-size: 14px; font-weight: 800; color: ${statusColor}; margin-bottom: 4px;">
        ${isDetected ? "🛡️ " : "ℹ️ "}${titleText}
      </div>
      <div style="font-size: 11px; color: var(--text-main); line-height: 1.4;">
        ${isDetected 
          ? "Client Protect is configured on this site. Embedded failsafe parameters and recovery routines are present in the page tag." 
          : "No structural Client Protect failsafe signatures were detected in the on-page scripts."}
      </div>
    </div>

    ${indicators.length > 0 ? `
      <div style="text-align: left; background: #ffffff; border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; margin-bottom: 12px;">
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px;">Detected Structural Signatures:</div>
        <ul style="margin: 0; padding-left: 18px; font-size: 11px; color: var(--text-main); line-height: 1.5;">
          ${indicators.map(ind => `<li>${ind}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <button id="resultBackToMenuBtn" class="primary-btn" style="margin-top: 8px; background: var(--surface-card); border: 1px solid var(--border-color); color: var(--text-main); width: 100%;">
      ⬅️ Back to Audits
    </button>
  `;

  showView('result', html);

  document.getElementById('resultBackToMenuBtn')?.addEventListener('click', () => showView('auditsView'));
};