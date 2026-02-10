(function () {
  "use strict";

  function scan() {
    var result = {
      lumajs: scanLuma(),
      alpine: scanAlpine()
    };

    window.postMessage({
      type: "bbf-page-scan-result",
      data: result
    }, "*");
  }

  // --- Luma / RequireJS scanner ---
  function scanLuma() {
    var data = { available: false };

    if (!window.require || !window.require.s) {
      return data;
    }

    data.available = true;

    // RequireJS defined modules
    try {
      var defined = Object.keys(window.require.s.contexts._.defined);
      defined.sort();
      data.modules = defined;
    } catch (e) {
      data.modules = [];
    }

    // uiRegistry
    try {
      var registry = window.require("uiRegistry");
      if (registry && registry._elems && registry._elems.length) {
        data.uiComponents = [];
        for (var i = 0; i < registry._elems.length; i++) {
          var comp = registry._elems[i];
          data.uiComponents.push({
            name: comp.name || comp.index || "(unnamed)",
            component: comp.component || ""
          });
        }
      }
    } catch (e) {
      // uiRegistry not available
    }

    // data-mage-init elements
    var mageInits = document.querySelectorAll("[data-mage-init]");
    if (mageInits.length) {
      data.mageInit = [];
      for (var j = 0; j < mageInits.length; j++) {
        var el = mageInits[j];
        var tag = el.tagName.toLowerCase();
        var id = el.id ? "#" + el.id : "";
        var cls = el.className ? "." + String(el.className).trim().split(/\s+/).slice(0, 2).join(".") : "";
        data.mageInit.push({
          selector: tag + id + cls,
          raw: el.getAttribute("data-mage-init")
        });
      }
    }

    // x-magento-init scripts
    var xInits = document.querySelectorAll('script[type="text/x-magento-init"]');
    if (xInits.length) {
      data.xMagentoInit = [];
      for (var k = 0; k < xInits.length; k++) {
        var content = xInits[k].textContent.trim();
        var parsed = null;
        try { parsed = JSON.parse(content); } catch (e) { /* ignore */ }

        if (parsed) {
          var selectors = Object.keys(parsed);
          for (var m = 0; m < selectors.length; m++) {
            var sel = selectors[m];
            data.xMagentoInit.push({
              selector: sel,
              widgets: Object.keys(parsed[sel]),
              config: parsed[sel]
            });
          }
        } else {
          data.xMagentoInit.push({
            selector: "(parse error)",
            widgets: [],
            config: content.substring(0, 200)
          });
        }
      }
    }

    return data;
  }

  // --- Alpine scanner ---
  function scanAlpine() {
    var Alpine = window.Alpine || window.__Alpine || null;
    var data = { available: false };

    if (!Alpine) {
      return data;
    }

    data.available = true;
    data.version = Alpine.version || null;

    // Components — [x-data] elements
    var xDataEls = document.querySelectorAll("[x-data]");
    data.components = [];
    for (var i = 0; i < xDataEls.length; i++) {
      var el = xDataEls[i];
      // Skip devbar's own elements
      if (el.closest && el.closest(".devbar")) continue;

      var tag = el.tagName.toLowerCase();
      var id = el.id ? "#" + el.id : "";
      var cls = el.className ? "." + String(el.className).trim().split(/\s+/).slice(0, 2).join(".") : "";
      var xData = el.getAttribute("x-data") || "";

      var liveData = null;
      if (Alpine.$data) {
        try {
          liveData = JSON.stringify(Alpine.$data(el), null, 2);
        } catch (e) {
          liveData = "(unable to read data)";
        }
      }

      data.components.push({
        label: tag + id + cls,
        xData: xData,
        liveData: liveData
      });
    }

    // Stores
    if (Alpine._stores) {
      data.stores = {};
      var storeKeys = Object.keys(Alpine._stores).sort();
      for (var j = 0; j < storeKeys.length; j++) {
        var key = storeKeys[j];
        try {
          data.stores[key] = JSON.stringify(Alpine._stores[key], null, 2);
        } catch (e) {
          data.stores[key] = "(unable to serialize)";
        }
      }
    }

    return data;
  }

  // --- Block highlighting via existing toolbar widget ---
  function handleHighlight(data) {
    var $ = window.llapgochjQueryLoader && window.llapgochjQueryLoader.$;
    if (!$) {
      postHighlightResult(false, "jQuery not available");
      return;
    }

    var $widget = $(".js-breakfastbar-block-widget");
    if (!$widget.length || !$widget.data("llapgochBreakfastbarblockviewer")) {
      postHighlightResult(false, "Block viewer widget not found");
      return;
    }

    if (data.action === "show" && data.blockName) {
      var instance = $widget.data("llapgochBreakfastbarblockviewer");

      // Clean up previous highlight state without triggering a fade-out animation.
      $("body").stop(true, false);                   // kill queued scroll animation
      instance._off(instance.window, "resize");       // remove accumulated resize handlers
      if (instance._blockTimeout) {
        window.clearTimeout(instance._blockTimeout);
        instance._blockTimeout = null;
      }

      // Ensure the overlay is visible and animation-free before the call.
      // The toolbar never hides the overlay between block switches, so
      // _show() inside showOverlayForBlock is always a no-op for it.
      // We replicate that: stop any running jQuery animation and force
      // the overlay visible, so _show() won't run a full fade animation
      // (which saves/restores old CSS properties including position).
      if (instance.overlay) {
        instance.overlay.stop(true, false).css("opacity", "").show();
      }

      // Temporarily replace showBlockOverlay so that _show() (with its
      // {effect:"fade", duration:250}) never runs. The overlay is already
      // visible above, and the CSS transition on .devbar__overlay handles
      // the smooth position animation — we don't need jQuery's fade.
      var origShowBlock = instance.showBlockOverlay;
      instance.showBlockOverlay = function () {
        // no-op: overlay is already visible
      };

      var result = instance.showOverlayForBlock(data.blockName);

      // Restore the original method immediately
      instance.showBlockOverlay = origShowBlock;

      postHighlightResult(!!result);
    } else if (data.action === "hide") {
      $widget.breakfastbarblockviewer("hideBlockOverlay");
      postHighlightResult(true);
    }
  }

  function postHighlightResult(success, error) {
    window.postMessage({
      type: "bbf-highlight-result",
      success: success,
      error: error || null
    }, "*");
  }

  // Listen for messages from content script
  window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    if (!event.data) return;

    if (event.data.type === "bbf-page-scan-request") {
      scan();
    } else if (event.data.type === "bbf-highlight-request") {
      handleHighlight(event.data);
    }
  });
})();
