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

  // --- Section builder ---
  function buildSection(title, count, collapsed, buildBodyFn) {
    var section = el("div", "bbf-js__section");

    var header = el("div", "bbf-js__section-header");
    header.dataset.action = "toggle-section";

    var arrow = el("span", "bbf-js__arrow", collapsed ? "\u25B6" : "\u25BC");
    header.appendChild(arrow);
    header.appendChild(document.createTextNode(" " + title + " "));
    header.appendChild(el("span", "bbf-js__count", String(count)));
    section.appendChild(header);

    var body = el("div", "bbf-js__section-body");
    if (collapsed) body.classList.add("is-collapsed");
    buildBodyFn(body);
    section.appendChild(body);

    return section;
  }

  // --- Expandable item with pre block ---
  function buildExpandableItem(name, detail, expandedText) {
    var item = el("div", "bbf-js__item bbf-js__item--expandable");
    item.dataset.action = "expand";

    item.appendChild(el("span", "bbf-js__item-name", name));
    if (detail) item.appendChild(el("span", "bbf-js__item-detail", detail));

    if (expandedText) {
      var expanded = el("div", "bbf-js__item-expanded");
      expanded.appendChild(el("pre", "bbf-js__pre", expandedText));
      item.appendChild(expanded);
    }

    return item;
  }

  function render(container, data) {
    var fragment = document.createDocumentFragment();

    if (!data || !data.available) {
      fragment.appendChild(el("div", "bbf__empty", "No Alpine.js found on this page."));
      container.textContent = "";
      container.appendChild(fragment);
      return;
    }

    var hasContent = false;

    // Version badge
    if (data.version) {
      hasContent = true;
      fragment.appendChild(el("div", "bbf-js__badge", "Alpine.js v" + data.version));
    }

    // Components
    if (data.components && data.components.length) {
      hasContent = true;
      fragment.appendChild(buildSection("Components", data.components.length, false, function (body) {
        for (var i = 0; i < data.components.length; i++) {
          var comp = data.components[i];
          body.appendChild(buildExpandableItem(
            comp.label,
            comp.xData ? truncate(comp.xData, 80) : null,
            comp.liveData
          ));
        }
      }));
    }

    // Stores
    if (data.stores && Object.keys(data.stores).length) {
      hasContent = true;
      var storeKeys = Object.keys(data.stores);
      fragment.appendChild(buildSection("Stores", storeKeys.length, false, function (body) {
        for (var i = 0; i < storeKeys.length; i++) {
          body.appendChild(buildExpandableItem(
            storeKeys[i],
            "store",
            data.stores[storeKeys[i]]
          ));
        }
      }));
    }

    if (!hasContent) {
      fragment.appendChild(el("div", "bbf__empty", "Alpine.js detected but no component data found."));
    }

    container.textContent = "";
    container.appendChild(fragment);
    bindEvents(container);
  }

  function bindEvents(container) {
    container.addEventListener("click", function (e) {
      var target = e.target;

      // Section toggle
      var header = target.closest("[data-action='toggle-section']");
      if (header) {
        var body = header.nextElementSibling;
        var arrow = header.querySelector(".bbf-js__arrow");
        if (body) {
          var collapsed = body.classList.toggle("is-collapsed");
          if (arrow) arrow.textContent = collapsed ? "\u25B6" : "\u25BC";
        }
        return;
      }

      // Item expand
      var item = target.closest("[data-action='expand']");
      if (item) {
        if (target.closest(".bbf-js__item-expanded")) return;
        var expanded = item.querySelector(".bbf-js__item-expanded");
        if (expanded) expanded.classList.toggle("is-open");
        return;
      }
    });
  }

  window.BBF.renderers.alpine = { render: render };
})();
