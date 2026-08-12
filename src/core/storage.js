/**
 * CHRISTOPHER THE COMPASS - Storage Defaults & Helpers
 */

export const DEFAULT_COOKIE_KEY = 'admiral';
export const DEFAULT_COOKIE_VAL = 'testing';
export const DEFAULT_TARGETING_KEYS = 'admiral-engaged, admiral-extended, admiral-shaped, admiral-proxied';
export const DEFAULT_DNS_SELECTOR = 'footer';
export const DEFAULT_DNS_CUSTOM_CSS = '';

export const initStorageDefaults = async () => {
  const store = await chrome.storage.local.get([
    'cookieKey',
    'cookieVal',
    'targetingKeys',
    'dnsSelector',
    'dnsCustomCss'
  ]);

  const defaultsToSet = {};

  if (store.cookieKey === undefined) defaultsToSet.cookieKey = DEFAULT_COOKIE_KEY;
  if (store.cookieVal === undefined) defaultsToSet.cookieVal = DEFAULT_COOKIE_VAL;
  if (store.targetingKeys === undefined) defaultsToSet.targetingKeys = DEFAULT_TARGETING_KEYS;
  if (store.dnsSelector === undefined) defaultsToSet.dnsSelector = DEFAULT_DNS_SELECTOR;
  if (store.dnsCustomCss === undefined) defaultsToSet.dnsCustomCss = DEFAULT_DNS_CUSTOM_CSS;

  if (Object.keys(defaultsToSet).length > 0) {
    await chrome.storage.local.set(defaultsToSet);
  }
};

export const getSettings = async () => {
  const store = await chrome.storage.local.get([
    'cookieKey', 
    'cookieVal', 
    'targetingKeys', 
    'dnsSelector',
    'dnsCustomCss'
  ]);

  return {
    cookieKey: store.cookieKey || DEFAULT_COOKIE_KEY,
    cookieVal: store.cookieVal || DEFAULT_COOKIE_VAL,
    targetingKeys: store.targetingKeys || DEFAULT_TARGETING_KEYS,
    dnsSelector: store.dnsSelector || DEFAULT_DNS_SELECTOR,
    dnsCustomCss: store.dnsCustomCss || DEFAULT_DNS_CUSTOM_CSS
  };
};

export const saveSettings = async (cookieKey, cookieVal, targetingKeys, dnsSelector, dnsCustomCss) => {
  await chrome.storage.local.set({
    cookieKey: cookieKey || DEFAULT_COOKIE_KEY,
    cookieVal: cookieVal || DEFAULT_COOKIE_VAL,
    targetingKeys: targetingKeys || DEFAULT_TARGETING_KEYS,
    dnsSelector: dnsSelector || DEFAULT_DNS_SELECTOR,
    dnsCustomCss: dnsCustomCss || DEFAULT_DNS_CUSTOM_CSS
  });
};