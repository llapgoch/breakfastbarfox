browser.devtools.panels.create(
  "Breakfast Bar",
  // PNG, not SVG — the DevTools panel icon won't render an SVG (shows a blank square)
  "/icons/icon-32.png",
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
