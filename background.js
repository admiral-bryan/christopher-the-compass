/**
 * CHRISTOPHER THE COMPASS - Background Engine & Service Worker
 */

const AD_DOMAINS = [
  "*://*.doubleclick.net/*",
  "*://*.googlesyndication.com/*",
  "*://*.adnxs.com/*",
  "*://*.rubiconproject.com/*",
  "*://*.pubmatic.com/*",
  "*://*.criteo.com/*",
  "*://*.amazon-adsystem.com/*",
  "*://*.taboola.com/*",
  "*://*.outbrain.com/*"
];

const tabAdNetworkLog = {};
const ADMIRAL_BLOCK_RULE_ID = 999;

// 1. Tab Lifecycle Listeners & Garbage Collection
chrome.tabs.onRemoved.addListener(async (tabId) => {
  delete tabAdNetworkLog[tabId];

  // Clean up tab-isolated session storage memory
  try {
    const forcedScriptKey = `forcedScriptText_${tabId}`;
    const blockedDomainKey = `blockedDomain_${tabId}`;
    await chrome.storage.session.remove([forcedScriptKey, blockedDomainKey]);
  } catch (e) {
    // Session storage cleanup safety fallback
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabAdNetworkLog[tabId] = 0;
  }
});

// 2. WebRequest Ad Network Counter
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.tabId > -1 && (details.type === 'sub_frame' || details.type === 'xmlhttprequest')) {
      tabAdNetworkLog[details.tabId] = (tabAdNetworkLog[details.tabId] || 0) + 1;
    }
  },
  { urls: AD_DOMAINS }
);

// 3. Consolidated Message Passing Endpoint
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getNetworkAdCount':
      sendResponse({ count: tabAdNetworkLog[request.tabId] || 0 });
      break;

    case 'blockServingDomain': {
      const domain = request.domain;
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ADMIRAL_BLOCK_RULE_ID],
        addRules: [{
          id: ADMIRAL_BLOCK_RULE_ID,
          priority: 1,
          action: { type: 'block' },
          condition: { 
            urlFilter: `||${domain}^`, 
            resourceTypes: ['script', 'xmlhttprequest', 'sub_frame'] 
          }
        }]
      }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true });
        }
      });
      return true; // Keep message channel open for async response
    }

    case 'unblockServingDomain':
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ADMIRAL_BLOCK_RULE_ID]
      }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true });
        }
      });
      return true; // Keep message channel open for async response

    default:
      break;
  }

  return true;
});

// 4. Global Script Override Session Injector
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')) {
    try {
      const key = `forcedScriptText_${tabId}`;
      const result = await chrome.storage.session.get([key]);
      
      if (result && result[key]) {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          world: "MAIN",
          func: (codeToRun) => {
            const inject = () => {
              const existingScript = document.querySelector('script[src*="getadmiral.com"], script[data-forced-by]');
              if (existingScript) existingScript.remove();

              const script = document.createElement('script');
              script.type = 'text/javascript';
              script.text = codeToRun;
              script.setAttribute('data-forced-by', 'christopher-the-compass-background');
              
              const target = document.head || document.documentElement;
              if (target) {
                target.appendChild(script);
              }
            };

            if (document.head || document.documentElement) {
              inject();
            } else {
              document.addEventListener('DOMContentLoaded', inject, { once: true });
            }
          },
          args: [result[key]]
        });
      }
    } catch (err) {
      console.warn("Compass background injector bypassed frame/sandbox restrictions safely:", err.message);
    }
  }
});

// 5. Side Panel Action Trigger
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Side panel configuration error:", error));