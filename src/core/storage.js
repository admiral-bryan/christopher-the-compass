export const DEFAULT_COOKIE_KEY = 'admiral';
export const DEFAULT_COOKIE_VAL = 'testing';
export const DEFAULT_TARGETING_KEYS = 'admiral-engaged, admiral-extended, admiral-shaped, admiral-proxied';

export const initStorageDefaults = async () => {
  try {
    const store = await chrome.storage.local.get(['cookieKey', 'cookieVal', 'targetingKeys']);
    const updates = {};

    if (store.cookieKey === undefined) updates.cookieKey = DEFAULT_COOKIE_KEY;
    if (store.cookieVal === undefined) updates.cookieVal = DEFAULT_COOKIE_VAL;
    if (store.targetingKeys === undefined) updates.targetingKeys = DEFAULT_TARGETING_KEYS;
    
    if (Object.keys(updates).length > 0) {
      await chrome.storage.local.set(updates);
    }
  } catch (err) {
    console.warn("Compass storage defaults initialization bypassed:", err.message);
  }
};