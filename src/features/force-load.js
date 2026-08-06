import { showView } from '../core/navigation.js';
import { updateStatus } from '../core/utils.js';

export const renderForceLoadUI = async () => {
  const container = document.getElementById('force-load-container');
  if (!container) return;

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab) return;

  const scriptKey = `forcedScriptText_${tab.id}`;
  const pidKey = `activeForcedPid_${tab.id}`;

  const session = await chrome.storage.session.get([scriptKey, pidKey]);
  const local = await chrome.storage.local.get(["lastUsedPid"]);

  if (session[scriptKey] && session[pidKey]) {
    container.innerHTML = `
      <div class="active-session-card">
        <div class="session-indicator">
          <div class="radar"></div>
          Session Persistent
        </div>
        <div class="session-pid">${session[pidKey]}</div>
        <div class="session-desc" style="font-size:9.5px; color:var(--text-muted); margin-bottom:10px;">Injected globally on this tab.</div>
        <button id="clearSessionBtn" class="clear-session-btn">Stop &amp; Clear Session</button>
      </div>
    `;

    document.getElementById('clearSessionBtn')?.addEventListener('click', async () => {
      await chrome.storage.session.remove([scriptKey, pidKey]);
      showView('result', 'Session persistence terminated.<br><small style="color:var(--text-muted); display:block; margin-top:6px;">Refresh your tab to clear memory execution layers.</small>');
      renderForceLoadUI();
    });

  } else {
    const defaultPid = local.lastUsedPid || "";
    
    container.innerHTML = `
      <p style="margin-top:0; margin-bottom:6px; font-size:10px; text-align:left; font-weight:600; color:var(--text-muted);">Force platform load via API</p>
      <input type="text" id="forcePidInput" class="input-field" style="text-align:center;" placeholder="PR-XXXXXX-X" value="${defaultPid}">
      <button id="forceLoadBtn" class="primary-btn">Inject Platform</button>
      ${defaultPid ? '<button id="clearSavedPidBtn" class="link-action danger" style="margin-top:6px;">Clear Saved ID</button>' : ''}
    `;

    document.getElementById('forceLoadBtn')?.addEventListener('click', handleForceLoad);

    const clearSavedBtn = document.getElementById('clearSavedPidBtn');
    if (clearSavedBtn) {
      clearSavedBtn.addEventListener('click', async () => {
        await chrome.storage.local.remove(["lastUsedPid"]);
        const inputField = document.getElementById('forcePidInput');
        if (inputField) inputField.value = "";
        clearSavedBtn.remove();
        updateStatus("Saved Property ID cleared.");
        setTimeout(() => { updateStatus(""); }, 2500);
      });
    }
  }
};

export const handleForceLoad = async () => {
  const pidInput = document.getElementById('forcePidInput')?.value.trim();

  if (!pidInput) {
    updateStatus("Please enter a valid Property ID.");
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab) return;
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: () => {
      const findPID = (obj) => {
        if (!obj || typeof obj !== 'object') return null;
        if (obj.propertyID) return obj.propertyID;
        for (const key in obj) {
          const res = findPID(obj[key]);
          if (res) return res;
        }
        return null;
      };

      const existingPid = findPID(window.admiral?.a);
      const scriptExists = !!document.querySelector('script[src*="getadmiral.com"], script[data-forced-by]');
      
      return {
        hasInstance: !!window.admiral || scriptExists,
        existingPid: existingPid || "Unknown PID"
      };
    }
  }, async (checkResults) => {
    const check = checkResults[0]?.result || { hasInstance: false, existingPid: "" };

    if (check.hasInstance) {
      const confirmOverwrite = confirm(
        `An active Admiral tag was detected on this page (${check.existingPid}).\n\n` +
        `Do you want to overwrite it with Property ID: ${pidInput}?`
      );

      if (!confirmOverwrite) {
        updateStatus("Tag injection canceled.");
        return;
      }
    }

    updateStatus("Querying Install API...");
    const targetUrl = `https://delivery.api.getadmiral.com/script/${pidInput}/bootstrap?environment=production`;

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error(`API responded with status code: ${response.status}`);
      
      const rawJsText = await response.text();
      if (!rawJsText || rawJsText.trim().length === 0) {
        throw new Error("The API returned an empty script payload.");
      }

      const scriptKey = `forcedScriptText_${tab.id}`;
      const pidKey = `activeForcedPid_${tab.id}`;

      await chrome.storage.local.set({ lastUsedPid: pidInput });
      
      const sessionPayload = {};
      sessionPayload[scriptKey] = rawJsText;
      sessionPayload[pidKey] = pidInput;
      await chrome.storage.session.set(sessionPayload);

      if (chrome.storage.session.setAccessLevel) {
        await chrome.storage.session.setAccessLevel({ 
          accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' 
        });
      }

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: (codeToRun) => {
          const oldScripts = document.querySelectorAll('script[src*="getadmiral.com"], script[data-forced-by]');
          oldScripts.forEach(s => s.remove());

          if (window.admiral) delete window.admiral;
          
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.text = codeToRun; 
          script.setAttribute('data-forced-by', 'christopher-the-compass');
          
          (document.head || document.documentElement).appendChild(script);
          return { success: true };
        },
        args: [rawJsText]
      }, (results) => {
        const res = results[0]?.result;
        if (res && res.success) {
          showView('result', `
            Platform forced successfully.<br><br>
            <strong>Session Persistence Locked:</strong> Active<br>
            <small style="color:var(--text-muted); display:block; margin-top:6px; line-height:1.3;">
              The tag will automatically inject itself on subsequent refreshes within this tab session.
            </small>
          `);
          renderForceLoadUI();
        } else {
          updateStatus(res?.reason || "Execution failed.");
        }
      });

    } catch (err) {
      updateStatus(`Error: ${err.message}`);
    }
  });
};