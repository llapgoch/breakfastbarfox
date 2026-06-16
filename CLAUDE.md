# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **Firefox DevTools extension** (Manifest V2) that mirrors the [Llapgoch Breakfast Bar](https://github.com/llapgoch/breakfastbar) Magento 2 developer toolbar inside the browser dev tools. It adds a "Breakfast Bar" DevTools tab with five sub-panels: Blocks, Handles, Request, Luma JS, Alpine.

There is **no build, lint, or test tooling** — no `package.json`, no bundler. The source files ship as-is.

## Run / debug

1. Firefox → `about:debugging` → "This Firefox" → "Load Temporary Add-on…" → select `manifest.json`.
2. Open DevTools (F12) on any page → "Breakfast Bar" tab.
3. After editing source, click the extension's **Reload** in `about:debugging`, then reopen DevTools. Temporary add-ons vanish on Firefox restart.

There is no automated test suite; verify changes by exercising the panel against a page with the Breakfast Bar Magento module installed.

## Architecture

Data flows across four extension contexts, each in a separate JS scope. This is the key thing to understand before changing anything:

```
DevTools Panel  ←port→  Background Script  ←tabs.sendMessage→  Content Script  ←postMessage→  Page Scanner
  panel/panel.js        background/...        content/...                       page/page-scanner.js
```

- **`panel/panel.js`** — runs in the DevTools panel. Opens a long-lived `runtime.connect` port named `breakfastbar-panel`, sends `init` with `inspectedWindow.tabId`, then `scan` / `highlight` messages. Routes scan results to renderers.
- **`background/background.js`** — pure relay. Maps `tabId → port` and forwards messages between the panel port and the content script via `tabs.sendMessage`. Has no logic of its own.
- **`content/content-script.js`** — runs in the page's isolated content scope (injected on `<all_urls>`). Reads server-injected data directly; injects the page scanner for anything needing page globals.
- **`page/page-scanner.js`** — injected into the **page's own** JS context (listed in `web_accessible_resources`) so it can touch `window.require`, `window.Alpine`, `window.llapgochjQueryLoader`, etc. that the content script's isolated scope can't see. Communicates only via `window.postMessage` with `bbf-`-prefixed message types.

### Two data sources per scan

A `scan` resolves `Promise.all([scanServerData(), scanPageData()])`:

- **Server data** (Blocks, Handles, Request): `content-script.js` reads the `#breakfastbar-data` JSON `<script>` blob injected by the companion Magento module. **Fallback:** if the blob is missing/unparseable, it walks DOM comments for `developer-toolbar-dom-marker` `…-start-viewer` markers to reconstruct a flat block list. The `_source` field (`json-blob` | `dom-comments`) flags which path was used.
- **Page data** (Luma JS, Alpine, overlay-capable block list): `page-scanner.js`, injected once (`pageScannerInjected` guard), reads page globals. 3s timeout fallback to `{}`.

### Renderers

Each `panel/renderers/<name>.js` is an IIFE that registers `window.BBF.renderers.<name> = { render, … }`. `panel.js` calls the matching renderer per data key. Conventions:

- All DOM built with the local `el(tag, className, text)` / `clearContainer` helpers — **never `innerHTML` with concatenated strings** (a past commit deliberately removed this; keep it that way for the unprivileged-DOM safety it buys).
- Luma JS and Alpine tabs are shown/hidden based on `data.lumajs.available` / `data.alpine.available` (Hyvä vs Luma storefronts). If the active tab gets hidden, panel falls back to Blocks.
- UI state persists in `localStorage`: `bbf-active-tab`, `bbf-expanded-all`.

### Block highlighting

The panel does **not** draw overlays itself. It sends a `highlight` message that `page-scanner.js` delegates to the **existing on-page toolbar widget** (`.js-breakfastbar-block-widget`'s `breakfastbarblockviewer` jQuery UI instance). The non-obvious code in `handleHighlight` suppresses the widget's jQuery fade so the CSS transition on `.devbar__overlay` animates position smoothly between block switches — change it carefully.

## Conventions

- The extension code is intentionally **ES5-style**: `var`, IIFEs with `"use strict"`, `function` callbacks (no arrow functions), `browser.*` (promise-based WebExtension) APIs, Manifest V2. Match this when editing — it overrides the modern-JS defaults in the global CLAUDE.md, *for this repo's extension code*.
- All cross-context page messages use the `bbf-` prefix and check `event.source === window`.

## Companion Magento module

The extension is useless without server-side changes in the Magento store (documented in `README.md`): a `DataInjector.php` block + `data-injector.phtml` template that emit `<script type="application/json" id="breakfastbar-data">`, wired via `default.xml`. Those files live in the Magento project, **not** this repo. After deploying them, `bin/magento cache:flush`.
