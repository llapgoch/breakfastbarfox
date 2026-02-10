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

  function renderTree(nodes, depth) {
    if (!nodes || typeof nodes !== "object") return "";

    var keys = Object.keys(nodes);
    if (!keys.length) return "";

    var html = '<ul class="bbf-tree" data-depth="' + depth + '">';

    for (var i = 0; i < keys.length; i++) {
      var name = keys[i];
      var node = nodes[name];
      var hasChildren = node.children && Object.keys(node.children).length > 0;
      var cssName = name.replace(/\./g, "-");

      html += '<li class="bbf-tree__item">';
      html += '<div class="bbf-tree__row" data-block-name="' + escapeHtml(name) + '">';

      // Toggle arrow
      if (hasChildren) {
        html += '<button class="bbf-tree__toggle" data-action="toggle">&#x25BC;</button>';
      } else {
        html += '<span class="bbf-tree__toggle bbf-tree__toggle--spacer"></span>';
      }

      // Name
      html += '<span class="bbf-tree__name">' + escapeHtml(name) + '</span>';

      // Extras
      var extras = getExtras(node);
      if (extras.length) {
        html += '<span class="bbf-tree__extras">';
        for (var j = 0; j < extras.length; j++) {
          html += '<span class="bbf-tree__extra bbf-tree__extra--' + extras[j].key + '">' + escapeHtml(extras[j].value) + '</span>';
        }
        html += '</span>';
      }

      // Highlight button
      html += '<button class="bbf-tree__highlight" data-action="highlight" data-layout-name="' + escapeHtml(cssName) + '">Highlight</button>';

      html += '</div>';

      // Children
      if (hasChildren) {
        html += '<div class="bbf-tree__children" data-depth="' + (depth + 1) + '">';
        html += renderTree(node.children, depth + 1);
        html += '</div>';
      }

      html += '</li>';
    }

    html += '</ul>';
    return html;
  }

  function getExtras(node) {
    var extras = [];
    if (node.type) extras.push({ key: "type", value: node.type });
    if (node.template) extras.push({ key: "template", value: node.template });
    if (node["block-type"]) extras.push({ key: "block-type", value: node["block-type"] });
    if (node.id) extras.push({ key: "id", value: "CMS Block: " + node.id });
    if (node["page-id"]) extras.push({ key: "page-id", value: "CMS Page: " + node["page-id"] });
    return extras;
  }

  function render(container, data) {
    if (!data) {
      container.innerHTML = '<div class="bbf__empty">No block data found. Is the BreakfastBar module installed?</div>';
      return;
    }

    // Handle flat comment-only fallback
    if (data._commentBlocks) {
      var html = '<div class="bbf__search"><input type="text" class="bbf__search-input" placeholder="Filter blocks..." data-filter="blocks"></div>';
      html += '<ul class="bbf-tree" data-depth="0">';
      for (var i = 0; i < data._commentBlocks.length; i++) {
        var name = data._commentBlocks[i];
        var cssName = name.replace(/\./g, "-");
        html += '<li class="bbf-tree__item">';
        html += '<div class="bbf-tree__row" data-block-name="' + escapeHtml(name) + '">';
        html += '<span class="bbf-tree__toggle bbf-tree__toggle--spacer"></span>';
        html += '<span class="bbf-tree__name">' + escapeHtml(name) + '</span>';
        html += '<button class="bbf-tree__highlight" data-action="highlight" data-layout-name="' + escapeHtml(cssName) + '">Highlight</button>';
        html += '</div></li>';
      }
      html += '</ul>';
      container.innerHTML = html;
      bindEvents(container);
      return;
    }

    // Full tree data from DataInjector
    var html = '<div class="bbf__search"><input type="text" class="bbf__search-input" placeholder="Filter blocks..." data-filter="blocks"></div>';
    html += renderTree(data, 0);
    container.innerHTML = html;
    bindEvents(container);
  }

  function bindEvents(container) {
    container.addEventListener("click", function (e) {
      var target = e.target;

      // Toggle expand/collapse
      if (target.closest("[data-action='toggle']")) {
        var btn = target.closest("[data-action='toggle']");
        var row = btn.closest(".bbf-tree__item");
        var children = row.querySelector(".bbf-tree__children");
        if (children) {
          var collapsed = children.classList.toggle("is-collapsed");
          btn.innerHTML = collapsed ? "&#x25B6;" : "&#x25BC;";
        }
        e.stopPropagation();
        return;
      }

      // Highlight
      if (target.closest("[data-action='highlight']")) {
        var hlBtn = target.closest("[data-action='highlight']");
        var blockName = hlBtn.dataset.layoutName;

        // Clear previous highlights
        var allHl = container.querySelectorAll(".bbf-tree__highlight.is-active");
        for (var i = 0; i < allHl.length; i++) {
          if (allHl[i] !== hlBtn) allHl[i].classList.remove("is-active");
        }

        var isShowing = window.BBF.highlightBlock(blockName);
        hlBtn.classList.toggle("is-active", isShowing);

        // Highlight the row too
        var allRows = container.querySelectorAll(".bbf-tree__row.is-active");
        for (var j = 0; j < allRows.length; j++) {
          allRows[j].classList.remove("is-active");
        }
        if (isShowing) {
          hlBtn.closest(".bbf-tree__row").classList.add("is-active");
        }

        e.stopPropagation();
        return;
      }
    });

    // Search filter
    var searchInput = container.querySelector("[data-filter='blocks']");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        var query = this.value.toLowerCase();
        var items = container.querySelectorAll(".bbf-tree__item");
        for (var i = 0; i < items.length; i++) {
          var name = items[i].querySelector(".bbf-tree__name");
          if (!name) continue;
          var text = name.textContent.toLowerCase();
          if (!query || text.indexOf(query) !== -1) {
            items[i].style.display = "";
          } else {
            items[i].style.display = "none";
          }
        }
      });
    }
  }

  function onHighlightResult(msg) {
    // Handle highlight error feedback if needed
  }

  window.BBF.renderers.blocks = {
    render: render,
    onHighlightResult: onHighlightResult
  };
})();
