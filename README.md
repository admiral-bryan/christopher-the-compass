# ⚓ Christopher The Compass

> **Version 3.1.0* | Diagnostic & Audit Extension for Admiral Property Integrations

**Christopher The Compass** is a specialized Chrome Extension designed for managing properties, auditing privacy frameworks, and inspecting tag integrations using Admiral. It eliminates manual console debugging by automatically scanning website data to identify key metrics and provide direct navigation to management interfaces through a modern card-based diagnostic dashboard.

---

## 🌟 Key Capabilities

* **Property Management:** Instantly detects the active Property ID (`window.admiral`) and generates a direct link to the corresponding property dashboard on `app.getadmiral.com`.
* **Visitor Targeting Readout:** Displays active targeting criteria, user classifications, and page segment rules in real time.
* **Adblock Status Verification:** Monitors measurement events to confirm whether adblocking software is active on the current view.
* **Ad Request KVP Scanner:** Audits Google Ad Manager (`googletag`) DOM targeting arrays and network request parameters to verify targeting key-value pairs (e.g., `admiral-engaged`, `admiral-extended`, `admiral-shaped`).
* **CMP Infrastructure Check:** Analyzes on-page consent engines (GPP / TCF v2) to verify whether the site is running Admiral's native CMP (ID: 9) or a third-party framework.
* **Journey Candidate Tracking:** Reports active candidate journeys shown during the pageview, automatically deduplicating group outputs.
* **Install Strategy Identification:** Audits deployment types, mapping code markers to human-readable methods (Direct, WordPress, API, Cloudflare, or NPM).
* **Page Ad Density & Unit Inspection (BETA):** Hybrid DOM and network diagnostic engine that scans ad slots, container heuristics, and passive ad network traffic. Features an interactive on-page highlighter and step-by-step element scrolling.
* **Developer Environment Simulation:** Allows support engineers to test custom Property IDs and apply domain-wide testing cookies (`.domain.com`) across subdomains and paths.

---

## 📁 Project Architecture

```text
christopher-the-compass/
├── manifest.json            # Manifest V3 setup (Side Panel, permissions, host rules)
├── background.js            # Background service worker & tab-isolated script overrides
├── terminal.html            # Main UI container for the Side Panel
├── src/
│   ├── css/
│   │   └── terminal.css     # Side panel interface styles
│   ├── core/
│   │   ├── navigation.js    # View state management & DOM utilities
│   │   └── utils.js         # Active tab resolution, status banners, & helper functions
│   │   └── storage.js         # Storage defaults and helpers
│   └── features/
│       ├── index.js         # Main module entry point
│       ├── property-link.js # Property ID detection & portal launcher
│       ├── check-targeting.js
│       ├── check-adblock.js
│       ├── check-candidate.js
│       ├── check-client-protect.js
│       ├── check-strategy.js
│       ├── count-ads.js
│       ├── check-ad-targeting.js
│       ├── check-cmp.js
│       ├── check-consent-signals.js
│       ├── test-cookie.js
│       └── force-load.js
│       └── inject-dns.js
│       └── serving-domain.js
│       └── settings.js
└── icon.png                 # Extension branding icon
