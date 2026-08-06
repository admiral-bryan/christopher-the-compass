import { showView } from '../core/navigation.js';
import { updateStatus } from '../core/utils.js';

export const initCountAds = () => {
  const runScan = async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) return;
    updateStatus("Auditing page elements...");

    chrome.runtime.sendMessage({ action: 'getNetworkAdCount', tabId: tab.id }, (response) => {
      const networkRequests = response?.count || 0;

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: () => {
          let dfpElementIds = [];
          if (window.googletag && window.googletag.apiReady) {
            try {
              const slots = window.googletag.pubads().getSlots();
              dfpElementIds = slots.map(s => s.getSlotElementId()).filter(Boolean);
            } catch (e) {}
          }

          const adSelectors = [
            'iframe[id^="google_ads_iframe"]',
            'div[id^="div-gpt-ad"]',
            '[class*="taboola"]',
            '[class*="outbrain"]',
            'ins.adsbygoogle',
            '[id*="ad-slot"]', '[class*="ad-slot"]',
            '[id*="ad_unit"]', '[class*="ad_unit"]',
            'div[data-adunit]',
            'div[data-dfp-ad-unit]'
          ];

          const matchedNodes = Array.from(document.querySelectorAll(adSelectors.join(', ')));
          const topLevelNodes = matchedNodes.filter(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return false;
            return !matchedNodes.some(parent => parent !== el && parent.contains(el));
          });

          return {
            dfpSlots: dfpElementIds.length,
            dfpElementIds: dfpElementIds,
            heuristicDomAds: topLevelNodes.length,
            selectorString: adSelectors.join(', ')
          };
        }
      }, (results) => {
        const data = results[0]?.result || { dfpSlots: 0, dfpElementIds: [], heuristicDomAds: 0, selectorString: '' };

        const confirmationHTML = `
          <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 8px;">Ad Criteria Review</div>
          <div style="font-size: 11px; color: var(--text-main); margin-bottom: 12px; line-height: 1.3;">Select detected signals to confirm what counts as an ad unit on this pageview:</div>

          <div style="background: white; border: 1px solid var(--border-color); border-radius: 8px; padding: 4px 10px; margin-bottom: 12px;">
            <div class="confirm-item">
              <input type="checkbox" id="checkDfp" value="${data.dfpSlots}" ${data.dfpSlots > 0 ? 'checked' : ''}>
              <div>
                <div class="confirm-title">Google Ad Manager (DFP)</div>
                <div class="confirm-sub">${data.dfpSlots} active slot(s) registered</div>
              </div>
            </div>

            <div class="confirm-item">
              <input type="checkbox" id="checkHeuristic" value="${data.heuristicDomAds}" ${data.heuristicDomAds > 0 && data.dfpSlots === 0 ? 'checked' : ''}>
              <div>
                <div class="confirm-title">DOM Container Heuristics</div>
                <div class="confirm-sub">${data.heuristicDomAds} visible ad container(s)</div>
              </div>
            </div>

            <div class="confirm-item">
              <input type="checkbox" id="checkNetwork" value="${networkRequests}">
              <div>
                <div class="confirm-title">Ad Network Requests</div>
                <div class="confirm-sub">${networkRequests} network call(s) detected</div>
              </div>
            </div>
          </div>

          <div id="finalTallyBox" style="font-size: 18px; font-weight: 800; color: var(--blue-accent); margin-bottom: 12px;">
            Detected Ad Units: <span id="tallyCount">0</span>
          </div>

          <div id="highlightActionWrapper">
            <button id="highlightOnPageBtn" class="primary-btn">Highlight Detected Ad Units</button>
          </div>
          <button id="rescanAdCountBtn" class="primary-btn" style="margin-top: 8px; background-color: #64748b;">
            🔄 Re-Audit Page Ads
          </button>
        `;

        showView('result', confirmationHTML);

        let totalFoundSlots = 0;
        let activeAdIndex = 0;
        let discardedIndices = new Set();

        const calculateTally = () => {
          let total = 0;
          const dfp = document.getElementById('checkDfp');
          const heuristic = document.getElementById('checkHeuristic');
          const network = document.getElementById('checkNetwork');

          const dfpVal = dfp && dfp.checked ? parseInt(dfp.value || 0, 10) : 0;
          const heuristicVal = heuristic && heuristic.checked ? parseInt(heuristic.value || 0, 10) : 0;
          const networkVal = network && network.checked ? parseInt(network.value || 0, 10) : 0;

          if (dfp && dfp.checked && heuristic && heuristic.checked) {
            total = Math.max(dfpVal, heuristicVal) + networkVal;
          } else {
            total = dfpVal + heuristicVal + networkVal;
          }

          total = Math.max(0, total - discardedIndices.size);

          const tallyEl = document.getElementById('tallyCount');
          if (tallyEl) tallyEl.innerText = total;

          const highlightBtn = document.getElementById('highlightOnPageBtn');
          if (highlightBtn) {
            if (total === 0 && totalFoundSlots === 0) {
              highlightBtn.disabled = true;
              highlightBtn.title = 'No ads detected';
            } else {
              highlightBtn.disabled = false;
              highlightBtn.removeAttribute('title');
            }
          }
        };

        document.getElementById('checkDfp')?.addEventListener('change', calculateTally);
        document.getElementById('checkHeuristic')?.addEventListener('change', calculateTally);
        document.getElementById('checkNetwork')?.addEventListener('change', calculateTally);
        document.getElementById('rescanAdCountBtn')?.addEventListener('click', runScan);
        calculateTally();

        const getActiveCriteriaTargetMode = () => {
          const dfpChecked = document.getElementById('checkDfp')?.checked;
          if (dfpChecked && data.dfpElementIds.length > 0) {
            return { mode: 'dfp', ids: data.dfpElementIds };
          }
          return { mode: 'heuristic', selectors: data.selectorString };
        };

        const updateInspectorState = (targetIdx) => {
          if (totalFoundSlots === 0) return;
          const targetConfig = getActiveCriteriaTargetMode();
          const isDiscarded = discardedIndices.has(targetIdx);

          const discardBtn = document.getElementById('discardSlotBtn');
          if (discardBtn) {
            if (isDiscarded) {
              discardBtn.innerText = "❌ Discarded (Click to Restore)";
              discardBtn.style.backgroundColor = "#fee2e2";
              discardBtn.style.color = "#dc2626";
              discardBtn.style.borderColor = "#fca5a5";
            } else {
              discardBtn.innerText = "I Don't See This Ad (Discard)";
              discardBtn.style.backgroundColor = "transparent";
              discardBtn.style.color = "#ef4444";
              discardBtn.style.borderColor = "#fca5a5";
            }
          }

          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: "MAIN",
            func: (config, currentIdx) => {
              let targetNodes = [];
              if (config.mode === 'dfp') {
                targetNodes = config.ids.map(id => document.getElementById(id)).filter(Boolean);
              } else {
                const matched = Array.from(document.querySelectorAll(config.selectors));
                targetNodes = matched.filter(el => {
                  const rect = el.getBoundingClientRect();
                  if (rect.width <= 0 || rect.height <= 0) return false;
                  return !matched.some(parent => parent !== el && parent.contains(el));
                });
              }

              targetNodes.forEach((el, i) => {
                const badge = el.querySelector('.compass-ad-badge');
                const elIsDiscarded = el.getAttribute('data-compass-discarded') === 'true';

                if (i === currentIdx) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  if (elIsDiscarded) {
                    el.style.outline = '4px dashed #64748b';
                    if (badge) {
                      badge.style.background = '#64748b';
                      badge.innerText = `[DISCARDED] Slot #${i + 1}`;
                    }
                  } else {
                    el.style.outline = '4px solid #3b82f6';
                    if (badge) {
                      badge.style.background = '#3b82f6';
                      badge.innerText = `>>> Ad Slot #${i + 1} <<<`;
                    }
                  }
                } else {
                  if (elIsDiscarded) {
                    el.style.outline = '2px dashed #cbd5e1';
                    if (badge) {
                      badge.style.background = '#cbd5e1';
                      badge.innerText = `[DISCARDED] Slot #${i + 1}`;
                    }
                  } else {
                    el.style.outline = '3px solid #ef4444';
                    if (badge) {
                      badge.style.background = '#ef4444';
                      badge.innerText = `Ad Slot #${i + 1}`;
                    }
                  }
                }
              });
            },
            args: [targetConfig, targetIdx]
          });
        };

        const updateStepperLabel = () => {
          const labelEl = document.getElementById('stepperLabel');
          if (labelEl) labelEl.innerText = `Ad ${activeAdIndex + 1} of ${totalFoundSlots}`;
        };

        const toggleDiscardCurrentSlot = () => {
          if (totalFoundSlots === 0) return;

          if (discardedIndices.has(activeAdIndex)) {
            discardedIndices.delete(activeAdIndex);
          } else {
            discardedIndices.add(activeAdIndex);
          }

          const isDiscarded = discardedIndices.has(activeAdIndex);
          const targetConfig = getActiveCriteriaTargetMode();

          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: "MAIN",
            func: (config, targetIdx, discarded) => {
              let targetNodes = [];
              if (config.mode === 'dfp') {
                targetNodes = config.ids.map(id => document.getElementById(id)).filter(Boolean);
              } else {
                const matched = Array.from(document.querySelectorAll(config.selectors));
                targetNodes = matched.filter(el => {
                  const rect = el.getBoundingClientRect();
                  if (rect.width <= 0 || rect.height <= 0) return false;
                  return !matched.some(parent => parent !== el && parent.contains(el));
                });
              }

              if (targetNodes[targetIdx]) {
                if (discarded) targetNodes[targetIdx].setAttribute('data-compass-discarded', 'true');
                else targetNodes[targetIdx].removeAttribute('data-compass-discarded');
              }
            },
            args: [targetConfig, activeAdIndex, isDiscarded]
          });

          calculateTally();
          updateInspectorState(activeAdIndex);
        };

        document.getElementById('highlightOnPageBtn')?.addEventListener('click', async () => {
          const targetConfig = getActiveCriteriaTargetMode();

          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: "MAIN",
            func: (config) => {
              document.querySelectorAll('.compass-ad-badge').forEach(b => b.remove());

              let targetNodes = [];
              if (config.mode === 'dfp') {
                targetNodes = config.ids.map(id => document.getElementById(id)).filter(Boolean);
              } else {
                const matched = Array.from(document.querySelectorAll(config.selectors));
                targetNodes = matched.filter(el => {
                  const rect = el.getBoundingClientRect();
                  if (rect.width <= 0 || rect.height <= 0) return false;
                  return !matched.some(parent => parent !== el && parent.contains(el));
                });
              }

              let count = 0;
              targetNodes.forEach((el) => {
                count++;
                el.removeAttribute('data-compass-discarded');
                el.style.outline = '3px solid #ef4444';
                el.style.position = 'relative';

                const badge = document.createElement('div');
                badge.className = 'compass-ad-badge';
                badge.innerText = `Ad Slot #${count}`;
                badge.style.cssText = `
                  position: absolute !important;
                  top: 0 !important;
                  left: 0 !important;
                  background: #ef4444 !important;
                  color: white !important;
                  font-size: 10px !important;
                  font-weight: 700 !important;
                  padding: 2px 6px !important;
                  z-index: 999999 !important;
                  font-family: sans-serif !important;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                  border-bottom-right-radius: 4px !important;
                  transition: all 0.2s ease !important;
                `;
                el.appendChild(badge);
              });

              return count;
            },
            args: [targetConfig]
          }, (highlightResults) => {
            const totalFound = highlightResults[0]?.result || 0;
            if (totalFound === 0) return;

            totalFoundSlots = totalFound;
            discardedIndices.clear();
            activeAdIndex = 0;

            const wrapper = document.getElementById('highlightActionWrapper');
            if (wrapper) {
              wrapper.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; background: var(--navy-dark); padding: 4px; border-radius: 6px; color: white; margin-bottom: 6px;">
                  <button id="prevAdBtn" style="background: rgba(255,255,255,0.15); color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: 700; font-size: 11px;">&larr; Prev</button>
                  <span id="stepperLabel" style="font-size: 11px; font-weight: 700;">Ad 1 of ${totalFound}</span>
                  <button id="nextAdBtn" style="background: rgba(255,255,255,0.15); color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: 700; font-size: 11px;">Next &rarr;</button>
                </div>
                <button id="discardSlotBtn" style="background-color: transparent; color: #ef4444; border: 1px solid #fca5a5; padding: 6px; border-radius: 6px; font-size: 10px; font-weight: 700; width: 100%; cursor: pointer; transition: all 0.2s;">
                  I Don't See This Ad (Discard)
                </button>
              `;
            }

            updateInspectorState(0);

            document.getElementById('prevAdBtn')?.addEventListener('click', () => {
              activeAdIndex = (activeAdIndex - 1 + totalFoundSlots) % totalFoundSlots;
              updateStepperLabel();
              updateInspectorState(activeAdIndex);
            });

            document.getElementById('nextAdBtn')?.addEventListener('click', () => {
              activeAdIndex = (activeAdIndex + 1) % totalFoundSlots;
              updateStepperLabel();
              updateInspectorState(activeAdIndex);
            });

            document.getElementById('discardSlotBtn')?.addEventListener('click', () => {
              toggleDiscardCurrentSlot();
            });
          });
        });
      });
    });
  };

  document.getElementById('countAdsBtn')?.addEventListener('click', runScan);
};