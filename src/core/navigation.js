import { updateStatus, generateLogHeader } from './utils.js';

export const showView = (viewId, content = "", isRaw = false) => {
  const menu = document.getElementById('menu-view');
  const result = document.getElementById('result-view');
  const resultContent = document.getElementById('result-content');
  const logEntry = document.getElementById('log-entry');

  if (viewId === 'result') {
    updateStatus(""); // Clear notification banners upon rendering result

    if (menu) menu.style.display = "none";
    if (result) result.style.display = "block";
    if (logEntry) logEntry.innerText = generateLogHeader();
    
    if (resultContent) {
      if (isRaw) {
        resultContent.innerHTML = `<pre>${content}</pre>`;
      } else {
        resultContent.innerHTML = `<div style="text-align:center; padding: 12px 0; font-weight: 500; line-height: 1.4; font-size:11.5px;">${content}</div>`;
      }
    }
  } else {
    if (menu) menu.style.display = "block";
    if (result) result.style.display = "none";
    
    // CRITICAL FIX: Wipe result container so duplicate IDs don't collide on future scans
    if (resultContent) resultContent.innerHTML = "";
    
    updateStatus("");
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

const escapeHtml = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const initNavigation = (onTabChange) => {
  document.getElementById('backBtn')?.addEventListener('click', () => showView('menu'));
  document.getElementById('dismissStatusBtn')?.addEventListener('click', () => updateStatus(""));

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