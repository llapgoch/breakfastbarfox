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

  function truncate(str, len) {
    if (!str) return "";
    if (str.length <= len) return str;
    return str.substring(0, len) + "\u2026";
  }

  // --- Tree building with DOM APIs ---
  function buildTree(nodes, depth) {
    if (!nodes || typeof nodes !== "object") return null;

    var keys = Object.keys(nodes);
    if (!keys.length) return null;

    var ul = el("ul", "bbf-tree");
    ul.dataset.depth = depth;

    for (var i = 0; i < keys.length; i++) {
      var name = keys[i];
      var node = nodes[name];
      var hasChildren = node.children && Object.keys(node.children).length > 0;
      var cssName = name.replace(/\./g, "-");

      var li = el("li", "bbf-tree__item");

      // Row
      var row = el("div", "bbf-tree__row");
      row.dataset.blockName = name;

      // Toggle arrow
      if (hasChildren) {
        var toggle = el("button", "bbf-tree__toggle", "\u25BC");
        toggle.dataset.action = "toggle";
        row.appendChild(toggle);
      } else {
        row.appendChild(el("span", "bbf-tree__toggle bbf-tree__toggle--spacer"));
      }

      // Name
      row.appendChild(el("span", "bbf-tree__name", name));

      // Extras
      var extras = getExtras(node);
      if (extras.length) {
        var extrasSpan = el("span", "bbf-tree__extras");
        for (var j = 0; j < extras.length; j++) {
          extrasSpan.appendChild(
            el("span", "bbf-tree__extra bbf-tree__extra--" + extras[j].key, extras[j].value)
          );
        }
        row.appendChild(extrasSpan);
      }

      // Highlight button
      var hlBtn = el("button", "bbf-tree__highlight", "Highlight");
      hlBtn.dataset.action = "highlight";
      hlBtn.dataset.layoutName = cssName;
      row.appendChild(hlBtn);

      li.appendChild(row);

      // Children
      if (hasChildren) {
        var childrenDiv = el("div", "bbf-tree__children");
        childrenDiv.dataset.depth = depth + 1;
        var childTree = buildTree(node.children, depth + 1);
        if (childTree) childrenDiv.appendChild(childTree);
        li.appendChild(childrenDiv);
      }

      ul.appendChild(li);
    }

    return ul;
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

  function buildSearchBar(filterName) {
    var wrapper = el("div", "bbf__search");
    var input = el("input", "bbf__search-input");
    input.type = "text";
    input.placeholder = "Filter " + filterName + "...";
    input.dataset.filter = filterName;
    wrapper.appendChild(input);
    return input;
  }

  function render(container, data) {
    var fragment = document.createDocumentFragment();

    if (!data) {
      fragment.appendChild(el("div", "bbf__empty", "No block data found. Is the BreakfastBar module installed?"));
      container.textContent = "";
      container.appendChild(fragment);
      return;
    }

    // Handle flat comment-only fallback
    if (data._commentBlocks) {
      var searchInput = buildSearchBar("blocks");
      fragment.appendChild(searchInput.parentNode);

      var ul = el("ul", "bbf-tree");
      ul.dataset.depth = "0";

      for (var i = 0; i < data._commentBlocks.length; i++) {
        var name = data._commentBlocks[i];
        var cssName = name.replace(/\./g, "-");

        var li = el("li", "bbf-tree__item");
        var row = el("div", "bbf-tree__row");
        row.dataset.blockName = name;

        row.appendChild(el("span", "bbf-tree__toggle bbf-tree__toggle--spacer"));
        row.appendChild(el("span", "bbf-tree__name", name));

        var hlBtn = el("button", "bbf-tree__highlight", "Highlight");
        hlBtn.dataset.action = "highlight";
        hlBtn.dataset.layoutName = cssName;
        row.appendChild(hlBtn);

        li.appendChild(row);
        ul.appendChild(li);
      }

      fragment.appendChild(ul);
      container.textContent = "";
      container.appendChild(fragment);
      bindEvents(container);
      return;
    }

    // Full tree data from DataInjector
    var searchInput = buildSearchBar("blocks");
    fragment.appendChild(searchInput.parentNode);

    var tree = buildTree(data, 0);
    if (tree) fragment.appendChild(tree);

    container.textContent = "";
    container.appendChild(fragment);
    bindEvents(container);
  }

  function bindEvents(container) {
    container.addEventListener("click", function (e) {
      var target = e.target;

      // Toggle expand/collapse
      if (target.closest("[data-action='toggle']")) {
        var btn = target.closest("[data-action='toggle']");
        var item = btn.closest(".bbf-tree__item");
        var children = item.querySelector(".bbf-tree__children");
        if (children) {
          var collapsed = children.classList.toggle("is-collapsed");
          btn.textContent = collapsed ? "\u25B6" : "\u25BC";
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
          var nameEl = items[i].querySelector(".bbf-tree__name");
          if (!nameEl) continue;
          var text = nameEl.textContent.toLowerCase();
          items[i].style.display = (!query || text.indexOf(query) !== -1) ? "" : "none";
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
