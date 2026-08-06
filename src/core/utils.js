export const generateLogHeader = () => {
  const date = new Date().toLocaleDateString();
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `Log: ${date}-${randomStr}`;
};

export const updateStatus = (message) => {
  const statusEl = document.getElementById('status');
  const statusTextEl = document.getElementById('status-text');
  if (!statusEl || !statusTextEl) return;
  
  if (message) {
    statusTextEl.innerText = message;
    statusEl.style.display = "block";
  } else {
    statusTextEl.innerText = "";
    statusEl.style.display = "none";
  }
};

export const getRootDomain = (hostname) => {
  if (!hostname || hostname === 'localhost') return hostname;
  const cleanHost = hostname.toLowerCase().trim();
  const parts = cleanHost.split('.');
  if (parts.length <= 2) return cleanHost;
  
  const knownTwoPartTlds = ['co.uk', 'com.au', 'co.jp', 'org.uk', 'net.au', 'gov.uk'];
  const lastTwo = parts.slice(-2).join('.');
  if (knownTwoPartTlds.includes(lastTwo) && parts.length > 2) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
};

export const getActiveTab = async () => {
  const tabs = await chrome.tabs.query({ active: true });
  
  // Find the active webpage tab (ignore the extension side panel)
  const webTab = tabs.find(t => 
    t.url && 
    !t.url.startsWith('chrome-extension://') && 
    !t.url.startsWith('chrome://') && 
    !t.url.startsWith('about:') &&
    !t.url.startsWith('edge://')
  );

  if (webTab) return webTab;

  const [fallbackTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return fallbackTab && fallbackTab.id ? fallbackTab : null;
};