(function () {
  "use strict";

  window.BBF = window.BBF || {};
  window.BBF.renderers = window.BBF.renderers || {};

  function escapeHtml(str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  function render(container, data) {
    if (!data || !data.length) {
      container.innerHTML = '<div class="bbf__empty">No layout handles found.</div>';
      return;
    }

    var html = '<div class="bbf__search"><input type="text" class="bbf__search-input" placeholder="Filter handles..." data-filter="handles"></div>';
    html += '<ul class="bbf-handles__list">';

    for (var i = 0; i < data.length; i++) {
      html += '<li class="bbf-handles__item">';
      html += '<span class="bbf-handles__name">' + escapeHtml(data[i]) + '</span>';
      html += '</li>';
    }

    html += '</ul>';
    container.innerHTML = html;

    // Search filter
    var searchInput = container.querySelector("[data-filter='handles']");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        var query = this.value.toLowerCase();
        var items = container.querySelectorAll(".bbf-handles__item");
        for (var i = 0; i < items.length; i++) {
          var text = items[i].textContent.toLowerCase();
          items[i].classList.toggle("is-hidden", query && text.indexOf(query) === -1);
        }
      });
    }
  }

  window.BBF.renderers.handles = { render: render };
})();
