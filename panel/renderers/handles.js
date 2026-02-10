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

    if (!data || !data.length) {
      fragment.appendChild(el("div", "bbf__empty", "No layout handles found."));
      container.textContent = "";
      container.appendChild(fragment);
      return;
    }

    // Search bar
    var searchWrapper = el("div", "bbf__search");
    var searchInput = el("input", "bbf__search-input");
    searchInput.type = "text";
    searchInput.placeholder = "Filter handles...";
    searchInput.dataset.filter = "handles";
    searchWrapper.appendChild(searchInput);
    fragment.appendChild(searchWrapper);

    // Handle list
    var ul = el("ul", "bbf-handles__list");

    for (var i = 0; i < data.length; i++) {
      var li = el("li", "bbf-handles__item");
      li.appendChild(el("span", "bbf-handles__name", data[i]));
      ul.appendChild(li);
    }

    fragment.appendChild(ul);

    container.textContent = "";
    container.appendChild(fragment);

    // Search filter
    searchInput.addEventListener("input", function () {
      var query = this.value.toLowerCase();
      var items = container.querySelectorAll(".bbf-handles__item");
      for (var i = 0; i < items.length; i++) {
        var text = items[i].textContent.toLowerCase();
        items[i].classList.toggle("is-hidden", query !== "" && text.indexOf(query) === -1);
      }
    });
  }

  window.BBF.renderers.handles = { render: render };
})();
