(function () {
  "use strict";

  window.BBF = window.BBF || {};
  window.BBF.renderers = window.BBF.renderers || {};

  function el(tag, className, textContent) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent !== undefined) node.textContent = textContent;
    return node;
  }

  function render(container, data) {
    var fragment = document.createDocumentFragment();

    if (!data || typeof data !== "object" || !Object.keys(data).length) {
      fragment.appendChild(el("div", "bbf__empty", "No request info found."));
      container.textContent = "";
      container.appendChild(fragment);
      return;
    }

    var list = el("div", "bbf-kv__list");
    var keys = Object.keys(data);

    for (var i = 0; i < keys.length; i++) {
      var row = el("div", "bbf-kv__row");
      row.appendChild(el("span", "bbf-kv__label", keys[i]));
      row.appendChild(el("span", "bbf-kv__value", String(data[keys[i]])));
      list.appendChild(row);
    }

    fragment.appendChild(list);

    container.textContent = "";
    container.appendChild(fragment);
  }

  window.BBF.renderers.request = { render: render };
})();
