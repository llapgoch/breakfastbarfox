browser.devtools.panels.create(
  "Breakfast Bar",
  "/icons/icon.svg",
  "/panel/panel.html"
).then(function (panel) {
  panel.onShown.addListener(function (panelWindow) {
    if (panelWindow && panelWindow.BBF && panelWindow.BBF.onPanelShown) {
      panelWindow.BBF.onPanelShown();
    }
  });
}).catch(function (err) {
  console.error("Breakfast Bar: failed to create panel", err);
});
