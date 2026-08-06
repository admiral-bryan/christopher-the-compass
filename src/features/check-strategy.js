import { showView } from '../core/navigation.js';
import { updateStatus } from '../core/utils.js';

export const initCheckStrategy = () => {
  const runScan = async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) return;
    updateStatus("Analyzing tags...");

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => {
        const findStrategy = (obj) => {
          if (!obj || typeof obj !== 'object') return null;
          if ('_strategy' in obj && obj._strategy !== null) {
            return obj._strategy;
          }
          for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object') {
              const res = findStrategy(obj[key]);
              if (res !== null) return res;
            }
          }
          return null;
        };
        return findStrategy(window.admiral?.a);
      }
    }, (results) => {
      const strategyCode = results[0]?.result;
      
      const strategyMapping = {
        1: "Direct / Page Head",
        2: "Admiral Internal Preview System",
        3: "API Install",
        4: "WordPress Plugin",
        5: "NPM Package Managed Dependency",
        6: "Cloudflare Integration Tunnel"
      };

      if (strategyCode !== null && strategyCode !== undefined) {
        const methodName = strategyMapping[strategyCode] || `Unknown Code (${strategyCode})`;
        const outputMsg = `
          <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 6px;">Install Strategy</div>
          <div style="font-size: 18px; color: var(--blue-accent); font-weight: 700; margin-bottom: 4px;">Code ID: ${strategyCode}</div>
          <div style="font-size: 12px; font-weight: 700; color: var(--text-main);">${methodName}</div>
          <button id="rescanStrategyBtn" class="primary-btn" style="margin-top: 12px;">
            🔄 Re-Scan Strategy
          </button>
        `;
        showView('result', outputMsg);
        document.getElementById('rescanStrategyBtn')?.addEventListener('click', runScan);
      } else {
        updateStatus("Installation metrics not found.");
      }
    });
  };

  document.getElementById('checkStrategy')?.addEventListener('click', runScan);
};