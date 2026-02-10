(function () {
  "use strict";

  var overlay = null;
  var pageScannerInjected = false;
  var pendingPageScanResolve = null;

  // --- Listen for messages from background script ---
  browser.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.type === "scan") {
      handleScan(msg).then(sendResponse);
      return true; // async
    }

    if (msg.type === "highlight") {
      handleHighlight(msg);
      sendResponse({ type: "highlight-result", success: true });
      return false;
    }
  });

  // --- Scan orchestration ---
  function handleScan() {
    return Promise.all([
      scanServerData(),
      scanPageData()
    ]).then(function (results) {
      var serverData = results[0];
      var pageData = results[1];

      return {
        type: "scan-result",
        data: {
          blocks: serverData.blocks || null,
          handles: serverData.handles || null,
          request: serverData.request || null,
          lumajs: pageData.lumajs || null,
          alpine: pageData.alpine || null
        }
      };
    });
  }

  // --- Server-side data: read JSON blob or fallback to DOM comment scanning ---
  function scanServerData() {
    var el = document.getElementById("breakfastbar-data");
    if (el) {
      try {
        var data = JSON.parse(el.textContent);
        return Promise.resolve({
          blocks: data.blocks || null,
          handles: data.handles || null,
          request: data.request || null
        });
      } catch (e) {
        // fall through
      }
    }

    // Fallback: try to read data from DOM comment markers
    return Promise.resolve(scanDomComments());
  }

  function scanDomComments() {
    // Look for DOM comment markers left by the Magento module
    // Format: <!--block-name-start-viewer developer-toolbar-dom-marker-->
    var markers = [];
    var walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_COMMENT,
      null,
      false
    );

    var node;
    while (node = walker.nextNode()) {
      var val = node.nodeValue.trim();
      if (val.indexOf("developer-toolbar-dom-marker") !== -1) {
        markers.push({
          value: val,
          node: node
        });
      }
    }

    if (!markers.length) {
      return { blocks: null, handles: null, request: null };
    }

    // Build a flat list of block names from start markers
    var blockNames = [];
    for (var i = 0; i < markers.length; i++) {
      var val = markers[i].value;
      if (val.indexOf("-start-viewer") !== -1) {
        var name = val.replace("-start-viewer", "").replace("developer-toolbar-dom-marker", "").trim();
        // Convert CSS class back to layout name (hyphens to dots)
        name = name.replace(/-/g, ".");
        if (name) blockNames.push(name);
      }
    }

    return {
      blocks: blockNames.length ? { _commentBlocks: blockNames } : null,
      handles: null,
      request: null
    };
  }

  // --- Page-context data: inject scanner script ---
  function scanPageData() {
    return new Promise(function (resolve) {
      // Set up listener for response from page script
      function onPageMessage(event) {
        if (event.source !== window) return;
        if (!event.data || event.data.type !== "bbf-page-scan-result") return;
        window.removeEventListener("message", onPageMessage);
        resolve(event.data.data || {});
      }

      window.addEventListener("message", onPageMessage);

      // Inject page scanner if not already done
      if (!pageScannerInjected) {
        var script = document.createElement("script");
        script.src = browser.runtime.getURL("page/page-scanner.js");
        script.onload = function () {
          script.remove();
          pageScannerInjected = true;
          window.postMessage({ type: "bbf-page-scan-request" }, "*");
        };
        document.documentElement.appendChild(script);
      } else {
        window.postMessage({ type: "bbf-page-scan-request" }, "*");
      }

      // Timeout fallback
      setTimeout(function () {
        window.removeEventListener("message", onPageMessage);
        resolve({});
      }, 3000);
    });
  }

  // --- Block highlighting ---
  function handleHighlight(msg) {
    if (msg.action === "hide") {
      hideOverlay();
      return;
    }

    if (msg.action === "show" && msg.blockName) {
      showBlockOverlay(msg.blockName);
    }
  }

  function showBlockOverlay(blockName) {
    var cssName = blockName.replace(/\./g, "-");
    var startMarker = cssName + "-start-viewer developer-toolbar-dom-marker";
    var endMarker = cssName + "-end-viewer developer-toolbar-dom-marker";

    var startNode = null;
    var endNode = null;

    var walker = document.createTreeWalker(
      document.documentElement,
      NodeFilter.SHOW_COMMENT,
      null,
      false
    );

    var node;
    while (node = walker.nextNode()) {
      var val = node.nodeValue.trim();
      if (!startNode && val.indexOf(startMarker) !== -1) {
        startNode = node;
      }
      if (!endNode && val.indexOf(endMarker) !== -1) {
        endNode = node;
      }
      if (startNode && endNode) break;
    }

    if (!startNode || !endNode) {
      return;
    }

    // Calculate bounding rect of content between markers
    var dims = null;
    var current = startNode.nextSibling;

    while (current && current !== endNode) {
      if (current.nodeType === 1) { // Element node
        var el = current;
        if (isVisible(el)) {
          var rect = el.getBoundingClientRect();
          var elDims = {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            right: rect.right + window.scrollX,
            bottom: rect.bottom + window.scrollY
          };
          dims = mergeDims(dims, elDims);
        }
      }
      current = current.nextSibling;
    }

    if (!dims) {
      return;
    }

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.style.cssText = "position:absolute;z-index:2147483646;opacity:0.4;background:#818cf8;border:2px solid #6366f1;border-radius:3px;pointer-events:none;transition:all 400ms cubic-bezier(0.4,0,0.2,1);";
      document.body.appendChild(overlay);
    }

    var width = Math.min(document.documentElement.clientWidth - dims.left, dims.right - dims.left) || 10;
    var height = (dims.bottom - dims.top) || 10;

    overlay.style.display = "block";
    overlay.style.left = dims.left + "px";
    overlay.style.top = dims.top + "px";
    overlay.style.width = width + "px";
    overlay.style.height = height + "px";

    // Scroll into view
    window.scrollTo({
      top: Math.max(0, dims.top - 25),
      behavior: "smooth"
    });
  }

  function hideOverlay() {
    if (overlay) {
      overlay.style.display = "none";
    }
  }

  function isVisible(el) {
    if (el.tagName === "FORM") return true;
    return el.offsetWidth > 0 || el.offsetHeight > 0;
  }

  function mergeDims(a, b) {
    if (!a) return b;
    if (!b) return a;
    return {
      top: Math.min(a.top, b.top),
      left: Math.min(a.left, b.left),
      right: Math.max(a.right, b.right),
      bottom: Math.max(a.bottom, b.bottom)
    };
  }
})();
