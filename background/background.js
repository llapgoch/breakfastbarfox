(function () {
  "use strict";

  // Map tabId -> port (from devtools panel)
  var panelPorts = {};

  browser.runtime.onConnect.addListener(function (port) {
    if (port.name !== "breakfastbar-panel") return;

    var tabId = null;

    port.onMessage.addListener(function (msg) {
      if (msg.type === "init") {
        tabId = msg.tabId;
        panelPorts[tabId] = port;
        return;
      }

      // Forward scan/highlight requests to the content script
      if (tabId) {
        browser.tabs.sendMessage(tabId, msg).then(function (response) {
          if (response) {
            port.postMessage(response);
          }
        }).catch(function (err) {
          port.postMessage({
            type: "error",
            error: "Content script not available. Try refreshing the page."
          });
        });
      }
    });

    port.onDisconnect.addListener(function () {
      if (tabId && panelPorts[tabId] === port) {
        delete panelPorts[tabId];
      }
    });
  });
})();
