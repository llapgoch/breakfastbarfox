(function () {
  "use strict";

  var pageScannerInjected = false;

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
          alpine: pageData.alpine || null,
          overlayBlocks: pageData.overlayBlocks || [],
          _source: serverData._source || "unknown",
          _reason: serverData._reason || null,
          _markerCount: serverData._markerCount || 0
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
          request: data.request || null,
          _source: "json-blob"
        });
      } catch (e) {
        return Promise.resolve(scanDomComments("json-parse-error"));
      }
    }

    // Fallback: try to read data from DOM comment markers
    return Promise.resolve(scanDomComments("no-json-blob"));
  }

  function scanDomComments(reason) {
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

    var blockNames = [];
    for (var i = 0; i < markers.length; i++) {
      var val = markers[i].value;
      if (val.indexOf("-start-viewer") !== -1) {
        var name = val.replace("-start-viewer", "").replace("developer-toolbar-dom-marker", "").trim();
        name = name.replace(/-/g, ".");
        if (name) blockNames.push(name);
      }
    }

    return {
      blocks: blockNames.length ? { _commentBlocks: blockNames } : null,
      handles: null,
      request: null,
      _source: "dom-comments",
      _reason: reason || "fallback",
      _markerCount: markers.length
    };
  }

  // --- Page-context data: inject scanner script ---
  function scanPageData() {
    return new Promise(function (resolve) {
      function onPageMessage(event) {
        if (event.source !== window) return;
        if (!event.data || event.data.type !== "bbf-page-scan-result") return;
        window.removeEventListener("message", onPageMessage);
        resolve(event.data.data || {});
      }

      window.addEventListener("message", onPageMessage);

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

      setTimeout(function () {
        window.removeEventListener("message", onPageMessage);
        resolve({});
      }, 3000);
    });
  }

  // --- Block highlighting (delegates to existing toolbar widget via page script) ---
  function handleHighlight(msg) {
    window.postMessage({
      type: "bbf-highlight-request",
      action: msg.action,
      blockName: msg.blockName || null
    }, "*");
  }
})();
