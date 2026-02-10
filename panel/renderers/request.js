(function () {
  "use strict";

  window.BBF = window.BBF || {};
  window.BBF.renderers = window.BBF.renderers || {};

  function escapeHtml(str) {
    if (!str && str !== 0) return "";
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  function render(container, data) {
    if (!data || typeof data !== "object" || !Object.keys(data).length) {
      container.innerHTML = '<div class="bbf__empty">No request info found.</div>';
      return;
    }

    var html = '<div class="bbf-kv__list">';
    var keys = Object.keys(data);

    for (var i = 0; i < keys.length; i++) {
      var label = keys[i];
      var value = data[label];
      html += '<div class="bbf-kv__row">';
      html += '<span class="bbf-kv__label">' + escapeHtml(label) + '</span>';
      html += '<span class="bbf-kv__value">' + escapeHtml(value) + '</span>';
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  }

  window.BBF.renderers.request = { render: render };
})();
