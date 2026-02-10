(function () {
  "use strict";

  var port = null;
  var activeTab = localStorage.getItem("bbf-active-tab") || "blocks";
  var currentHighlightedBlock = null;
  var hasScanned = false;

  // --- DOM helpers ---
  function el(tag, className, textContent) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent !== undefined) node.textContent = textContent;
    return node;
  }

  function clearContainer(container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  // --- Port connection ---
  function connectPort() {
    try {
      port = browser.runtime.connect({ name: "breakfastbar-panel" });
      port.postMessage({ type: "init", tabId: browser.devtools.inspectedWindow.tabId });

      port.onMessage.addListener(function (msg) {
        if (msg.type === "error") {
          showError(msg.error);
          setLoading(false);
          return;
        }
        handleResponse(msg);
      });

      port.onDisconnect.addListener(function () {
        port = null;
      });
    } catch (err) {
      console.error("Breakfast Bar: connectPort failed", err);
      showError("Failed to connect: " + err.message);
    }
  }

  // --- Tab switching ---
  var tabs = document.querySelectorAll(".bbf__tab");
  var panels = document.querySelectorAll(".bbf__panel");

  function switchTab(name) {
    activeTab = name;
    localStorage.setItem("bbf-active-tab", name);
    tabs.forEach(function (t) {
      t.classList.toggle("is-active", t.dataset.panel === name);
    });
    panels.forEach(function (p) {
      p.classList.toggle("is-active", p.id === "panel-" + name);
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      switchTab(tab.dataset.panel);
    });
  });

  // Restore saved tab
  switchTab(activeTab);

  // --- Scan ---
  var refreshBtn = document.getElementById("bbf-refresh");

  function scanAll() {
    try {
      if (!port) connectPort();
      if (!port) return;
      setLoading(true);
      port.postMessage({ type: "scan", panel: "all" });
    } catch (err) {
      console.error("Breakfast Bar: scanAll failed", err);
      showError("Scan failed: " + err.message);
      setLoading(false);
    }
  }

  refreshBtn.addEventListener("click", scanAll);

  function setLoading(loading) {
    refreshBtn.classList.toggle("is-loading", loading);
  }

  // --- Response handling ---
  function handleResponse(msg) {
    setLoading(false);

    if (msg.type === "scan-result") {
      var data = msg.data;
      var sourceInfo = {
        source: data._source || "unknown",
        reason: data._reason || null,
        markerCount: data._markerCount || 0
      };

      if (data.blocks !== undefined) {
        window.BBF.renderers.blocks.render(
          document.getElementById("panel-blocks"),
          data.blocks,
          data.overlayBlocks || []
        );
      }
      if (data.handles !== undefined) {
        window.BBF.renderers.handles.render(
          document.getElementById("panel-handles"),
          data.handles,
          sourceInfo
        );
      }
      if (data.request !== undefined) {
        window.BBF.renderers.request.render(
          document.getElementById("panel-request"),
          data.request,
          sourceInfo
        );
      }
      if (data.lumajs !== undefined) {
        window.BBF.renderers.lumajs.render(
          document.getElementById("panel-lumajs"),
          data.lumajs
        );
      }
      if (data.alpine !== undefined) {
        window.BBF.renderers.alpine.render(
          document.getElementById("panel-alpine"),
          data.alpine
        );
      }
    }

    if (msg.type === "highlight-result") {
      window.BBF.renderers.blocks.onHighlightResult(msg);
    }
  }

  function showError(message) {
    var activePanel = document.querySelector(".bbf__panel.is-active");
    if (activePanel) {
      clearContainer(activePanel);
      activePanel.appendChild(el("div", "bbf__error", message));
    }
  }

  // --- Highlight ---
  window.BBF = window.BBF || {};
  window.BBF.highlightBlock = function (blockName) {
    if (!port) connectPort();

    // Toggle off if clicking the same block
    if (currentHighlightedBlock === blockName) {
      port.postMessage({ type: "highlight", action: "hide" });
      currentHighlightedBlock = null;
      return false;
    }

    currentHighlightedBlock = blockName;
    port.postMessage({ type: "highlight", action: "show", blockName: blockName });
    return true;
  };

  window.BBF.getHighlightedBlock = function () {
    return currentHighlightedBlock;
  };

  // --- Panel shown callback (called from devtools.js) ---
  window.BBF.onPanelShown = function () {
    if (!hasScanned) {
      hasScanned = true;
      scanAll();
    }
  };

  // --- Navigation detection ---
  if (browser.devtools && browser.devtools.network && browser.devtools.network.onNavigated) {
    browser.devtools.network.onNavigated.addListener(function () {
      currentHighlightedBlock = null;
      hasScanned = false;
      setTimeout(scanAll, 500);
    });
  }

  // --- Shared utilities ---
  window.BBF.el = el;
  window.BBF.clearContainer = clearContainer;

  // --- Init ---
  // Defer initial scan — let the panel fully render first
  setTimeout(function () {
    connectPort();
    scanAll();
  }, 500);
})();
