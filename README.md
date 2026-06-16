# Breakfast Bar Fox

A Firefox DevTools extension companion for the [Llapgoch Breakfast Bar](https://github.com/llapgoch/breakfastbar) Magento 2 developer toolbar. Mirrors the on-page toolbar panels (Blocks, Handles, Request, Luma JS, Alpine) inside the browser developer tools.

## Install the extension

### Quick try (temporary)

1. Open Firefox and navigate to `about:debugging`
2. Click **"This Firefox"** in the left sidebar
3. Click **"Load Temporary Add-on..."**
4. Browse to this directory and select `manifest.json`
5. Open DevTools (F12) on any page — a **"Breakfast Bar"** tab will appear

> Temporary add-ons are removed when Firefox closes. For a persistent install, sign it (below).

### Persistent install (self-distributed signed `.xpi`)

Firefox release/beta only install **signed** extensions. We sign on the *unlisted*
channel — Mozilla signs the package but doesn't list it publicly, so it installs
permanently in any Firefox without going through review.

**Prerequisites:** Node 20+ and a free Mozilla add-on developer account.

1. **Use the right Node version.** `web-ext` needs Node 20+; older versions fail
   with `diagChan.tracingChannel is not a function`. The repo pins it via `.nvmrc`:
   ```
   nvm use      # switches to Node 20
   npm install  # first time only
   ```
2. **Add your signing credentials.** Generate an API key + secret at
   <https://addons.mozilla.org/developers/addon/api/key/>, then copy
   `.env.example` to `.env` and fill in `WEB_EXT_API_KEY` / `WEB_EXT_API_SECRET`.
   `.env` is gitignored — keep it that way.
3. **Lint and sign:**
   ```
   npm run lint
   npm run sign
   ```
   The `sign` script sources `.env` itself, so the credentials don't need to be
   exported manually. `web-ext` validates, signs, and downloads the result.
4. The signed `.xpi` lands in `web-ext-artifacts/` (e.g. `<hash>-1.0.1.xpi`).
5. **Install it:** drag the `.xpi` onto a Firefox window, or open `about:addons` →
   gear menu → **Install Add-on From File…** and pick the `.xpi`.

> ⚠️ **Bump `version` in `manifest.json` before every sign.** Mozilla permanently
> consumes a version number once it's signed and rejects a re-upload of the same
> one. New release → new version.

#### Manifest requirements for signing

These are already set in `manifest.json`; note them if you fork or rename:

- `browser_specific_settings.gecko.id` — a permanent add-on ID
  (`breakfastbarfox@llapgoch.dev`). Signing won't work without it.
- `data_collection_permissions: ["none"]` — declares the extension collects no
  data (now required by Mozilla).
- `strict_min_version: "142.0"` — the data-collection key needs Firefox 142+
  (specifically Firefox for Android 142). Don't lower this without removing that key.
- Icons are PNG, not SVG (AMO prefers raster). Regenerate from `icon.svg` with:
  ```
  for s in 16 32 48 96 128; do rsvg-convert -w $s -h $s icons/icon.svg -o icons/icon-$s.png; done
  ```

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
