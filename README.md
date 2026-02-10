# Breakfast Bar Fox

A Firefox DevTools extension companion for the [Llapgoch Breakfast Bar](https://github.com/llapgoch/breakfastbar) Magento 2 developer toolbar. Mirrors the on-page toolbar panels (Blocks, Handles, Request, Luma JS, Alpine) inside the browser developer tools.

## Install the extension

1. Open Firefox and navigate to `about:debugging`
2. Click **"This Firefox"** in the left sidebar
3. Click **"Load Temporary Add-on..."**
4. Browse to this directory and select `manifest.json`
5. Open DevTools (F12) on any page — a **"Breakfast Bar"** tab will appear

> **Note:** Temporary add-ons are removed when Firefox closes. For persistent installation, the extension would need to be signed via [addons.mozilla.org](https://addons.mozilla.org).

## Install the Magento module changes

The extension reads data from a JSON blob injected into the page by the Breakfast Bar module. Two files were added and one modified:

### New files

- `Block/DataInjector.php` — Block class that builds the JSON payload (block tree, handles, request info)
- `view/base/templates/data-injector.phtml` — Template that outputs `<script type="application/json" id="breakfastbar-data">`

### Modified file

- `view/base/layout/default.xml` — Added the DataInjector block reference

After deploying these changes, clear the Magento cache:

```
bin/magento cache:flush
```

## Usage

1. Navigate to a Magento page with the Breakfast Bar module installed
2. Open DevTools (F12) and select the **"Breakfast Bar"** tab
3. Data is scanned automatically on open and on page navigation
4. Click **"Scan"** to manually refresh
5. Use the five sub-tabs:
   - **Blocks** — Hierarchical layout tree with expand/collapse, search filter, and block highlighting
   - **Handles** — Layout handles list with search filter
   - **Request** — Routing and store info (module, controller, action, store, etc.)
   - **Luma JS** — RequireJS modules, uiRegistry components, `data-mage-init`, `x-magento-init`
   - **Alpine** — Alpine.js version, components with live data, stores

### Block highlighting

Click the **"Highlight"** button next to any block in the Blocks tab to scroll to and overlay that block on the page. Click again to dismiss.

## How it works

```
DevTools Panel  ←port→  Background Script  ←messages→  Content Script  ←postMessage→  Page Scanner
  panel.js              background.js                  content-script.js              page-scanner.js
```

- **Blocks, Handles, Request**: Content script reads the `#breakfastbar-data` JSON blob injected by the Magento module. Falls back to scanning DOM comment markers if the JSON blob is not present.
- **Luma JS, Alpine**: Content script injects `page-scanner.js` into the page context to access `window.require`, `window.Alpine`, and other globals that aren't available from the content script's isolated scope.
