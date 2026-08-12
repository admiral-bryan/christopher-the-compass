import { updateStatus, clearStatus, generateLogHeader } from './utils.js';

/**
 * Escapes special HTML characters to prevent XSS in dynamic cards
 */
const escapeHtml = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Transitions between UI views, cleans up status banners, and resets result content
 */
export const showView = (viewId, content = "", isRaw = false) => {
  // 1. Always clear status banners when switching views
  clearStatus();

  // 2. Hide all top-level view containers
  const views = document.querySelectorAll('.view-container');
  views.forEach(v => v.style.display = 'none');

  const menuView = document.getElementById('menuView') || document.getElementById('menu-view');
  const resultView = document.getElementById('resultView') || document.getElementById('result-view');
  const resultOutput = document.getElementById('resultOutput') || document.getElementById('result-content');
  const logEntry = document.getElementById('log-entry');

  if (viewId === 'result') {
    if (menuView) menuView.style.display = "none";
    if (resultView) resultView.style.display = "block";
    if (logEntry) logEntry.innerText = generateLogHeader();

    if (resultOutput) {
      if (isRaw) {
        resultOutput.innerHTML = `<pre style="white-space: pre-wrap; word-wrap: break-word;">${content}</pre>`;
      } else {
        resultOutput.innerHTML = `<div style="text-align:center; padding: 12px 0; font-weight: 500; line-height: 1.4; font-size:11.5px;">${content}</div>`;
      }
    }
  } else {
    // 3. Force hide result view when switching to any standard tool/menu view
    if (resultView) resultView.style.display = "none";
    if (resultOutput) resultOutput.innerHTML = "";

    // 4. Resolve target view accurately
    const targetView = document.getElementById(`${viewId}View`) || document.getElementById(viewId);
    if (targetView) {
      targetView.style.display = 'block';
    } else if (menuView) {
      menuView.style.display = 'block';
    }
  }
};

/**
 * Renders a human-readable card layout with a toggleable raw JSON viewer
 */
export const renderObjectCardView = (title, formattedData, rawObject = null) => {
  if (!formattedData || typeof formattedData !== 'object') {
    return `<div style="color: var(--text-muted); font-size: 11px;">No data available.</div>`;
  }

  const entries = Object.entries(formattedData);
  if (entries.length === 0) {
    return `<div style="color: var(--text-muted); font-size: 11px;">Empty data set.</div>`;
  }

  let rowsHTML = '';
  entries.forEach(([key, val]) => {
    let displayVal = val;
    if (Array.isArray(val)) {
      displayVal = val.join(', ');
    } else if (typeof val === 'object' && val !== null) {
      displayVal = JSON.stringify(val);
    } else if (val === null || val === undefined) {
      displayVal = 'None';
    }

    const strVal = String(displayVal);
    const isLongVal = strVal.length > 20;

    if (isLongVal) {
      rowsHTML += `
        <div style="padding: 6px 0; border-bottom: 1px solid var(--border-color); text-align: left;">
          <div style="font-weight: 700; color: var(--text-muted); font-size: 9.5px; text-transform: uppercase; margin-bottom: 2px;">
            ${escapeHtml(key)}
          </div>
          <div style="font-weight: 700; color: var(--emerald-accent); font-size: 10.5px; word-break: break-all; line-height: 1.3;">
            ${escapeHtml(strVal)}
          </div>
        </div>
      `;
    } else {
      rowsHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: 10.5px;">
          <span style="font-weight: 600; color: var(--text-main); font-family: monospace;">${escapeHtml(key)}</span>
          <span style="font-weight: 700; color: var(--emerald-accent);">
            ${escapeHtml(strVal)}
          </span>
        </div>
      `;
    }
  });

  const jsonPayload = JSON.stringify(rawObject || formattedData, null, 2);

  return `
    <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 8px; text-align: left;">
      ${escapeHtml(title)}
    </div>
    <div style="text-align: left; background: white; border: 1px solid var(--border-color); border-radius: 8px; padding: 4px 10px; margin-bottom: 8px;">
      ${rowsHTML}
    </div>
    <button id="toggleRawJsonBtn" style="font-size: 10px; color: var(--blue-accent); background: none; border: none; cursor: pointer; padding: 4px; text-decoration: underline;">
      🔍 View JSON
    </button>
    <div id="rawJsonContainer" style="display: none; margin-top: 8px; text-align: left;">
      <pre style="background: var(--navy-dark); color: #38bdf8; padding: 10px; border-radius: 6px; font-size: 9.5px; max-height: 200px; overflow: auto; white-space: pre-wrap; word-wrap: break-word; font-family: monospace; margin: 0;">${escapeHtml(jsonPayload)}</pre>
    </div>
  `;
};

/**
 * Attaches the View JSON toggle event listener
 */
export const bindJsonToggle = () => {
  const btn = document.getElementById('toggleRawJsonBtn');
  const container = document.getElementById('rawJsonContainer');

  if (btn && container) {
    btn.addEventListener('click', () => {
      if (container.style.display === 'none') {
        container.style.display = 'block';
        btn.innerText = '🙈 Hide JSON';
      } else {
        container.style.display = 'none';
        btn.innerText = '🔍 View JSON';
      }
    });
  }
};

/**
 * Binds global navigation listeners across header tabs and back buttons
 */
export const initNavigation = (onTabChange) => {
  const handleNavClick = (targetViewId, activeBtnId = null) => {
    showView(targetViewId);

    // Sync header active tab state visually
    if (activeBtnId) {
      document.querySelectorAll('.header-tab, .nav-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(activeBtnId)?.classList.add('active');
    }
  };

  // Header & Menu Back Buttons
  document.getElementById('backBtn')?.addEventListener('click', () => handleNavClick('menuView', 'navAuditsBtn'));
  document.getElementById('backToMenuBtn')?.addEventListener('click', () => handleNavClick('menuView', 'navAuditsBtn'));
  document.getElementById('navAuditsBtn')?.addEventListener('click', () => handleNavClick('menuView', 'navAuditsBtn'));
  document.getElementById('navDevToolsBtn')?.addEventListener('click', () => handleNavClick('devToolsView', 'navDevToolsBtn'));
  document.getElementById('navSettingsBtn')?.addEventListener('click', () => handleNavClick('settingsView', 'navSettingsBtn'));
  document.getElementById('dismissStatusBtn')?.addEventListener('click', () => updateStatus(""));

  // Tab switching inside feature sub-views
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.tab-btn');
      if (!targetBtn) return;

      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      targetBtn.classList.add('active');
      const panelId = targetBtn.getAttribute('data-tab');
      document.getElementById(panelId)?.classList.add('active');

      if (onTabChange) onTabChange(panelId);
    });
  });
};