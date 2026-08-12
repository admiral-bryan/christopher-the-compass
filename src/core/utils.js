/**
 * CHRISTOPHER THE COMPASS - Core Utility Helpers
 */

/**
 * Generates a unique, timestamped log header for result cards
 */
export const generateLogHeader = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `Log: ${dateStr} ${timeStr} [${randomStr}]`;
};

/**
 * Updates or displays the top status alert banner
 */
export const updateStatus = (message) => {
  const statusEl = document.getElementById('status') || document.getElementById('statusBanner');
  const statusTextEl = document.getElementById('status-text') || document.getElementById('statusText');
  
  if (!statusEl || !statusTextEl) return;
  
  if (message) {
    statusTextEl.innerText = message;
    statusEl.style.display = "flex";
  } else {
    statusTextEl.innerText = "";
    statusEl.style.display = "none";
  }
};

/**
 * Clears and hides the top status alert banner
 */
export const clearStatus = () => {
  updateStatus("");
};

/**
 * Safely extracts the root apex domain (e.g., "example.com" from "sub.example.com")
 */
export const getRootDomain = (hostname) => {
  if (!hostname || hostname === 'localhost') return hostname;
  
  const cleanHost = hostname.toLowerCase().trim();

  // Guard IPv4 addresses
  if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(cleanHost)) {
    return cleanHost;
  }

  const parts = cleanHost.split('.');
  if (parts.length <= 2) return cleanHost;
  
  const knownTwoPartTlds = ['co.uk', 'com.au', 'co.jp', 'org.uk', 'net.au', 'gov.uk', 'co.nz'];
  const lastTwo = parts.slice(-2).join('.');
  if (knownTwoPartTlds.includes(lastTwo) && parts.length > 2) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
};

/**
 * Safely resolves the active web tab in the current focused window
 */
export const getActiveTab = async () => {
  try {
    // 1. Target the active tab in the user's currently focused window
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    
    const webTab = tabs.find(t => 
      t.url && 
      !t.url.startsWith('chrome-extension://') && 
      !t.url.startsWith('chrome://') && 
      !t.url.startsWith('about:') &&
      !t.url.startsWith('edge://')
    );

    if (webTab) return webTab;

    // 2. Fallback query across active windows if window context was delayed
    const allActiveTabs = await chrome.tabs.query({ active: true });
    const fallbackTab = allActiveTabs.find(t => 
      t.url && 
      !t.url.startsWith('chrome-extension://') && 
      !t.url.startsWith('chrome://') && 
      !t.url.startsWith('about:') &&
      !t.url.startsWith('edge://')
    );

    return fallbackTab || null;
  } catch (err) {
    console.error("Error resolving active tab:", err);
    return null;
  }
};