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

  // --- Simple item (name only) ---
  function buildSimpleItem(name) {
    var item = el("div", "bbf-js__item");
    item.appendChild(el("span", "bbf-js__item-name", name));
    return item;
  }

  // --- Item with detail ---
  function buildDetailItem(name, detail) {
    var item = el("div", "bbf-js__item");
    item.appendChild(el("span", "bbf-js__item-name", name));
    if (detail) item.appendChild(el("span", "bbf-js__item-detail", detail));
    return item;
  }

  // --- Expandable item with pre block ---
  function buildExpandableItem(name, detail, expandedText) {
    var item = el("div", "bbf-js__item bbf-js__item--expandable");
    item.dataset.action = "expand";

    item.appendChild(el("span", "bbf-js__item-name", name));
    if (detail) item.appendChild(el("span", "bbf-js__item-detail", detail));

    var expanded = el("div", "bbf-js__item-expanded");
    expanded.appendChild(el("pre", "bbf-js__pre", expandedText));
    item.appendChild(expanded);

    return item;
  }

  function render(container, data) {
    var fragment = document.createDocumentFragment();

    if (!data || !data.available) {
      fragment.appendChild(el("div", "bbf__empty", "No RequireJS / Luma JS found on this page."));
      container.textContent = "";
      container.appendChild(fragment);
      return;
    }

    var hasContent = false;

    // RequireJS modules
    if (data.modules && data.modules.length) {
      hasContent = true;
      fragment.appendChild(buildSection("RequireJS Modules", data.modules.length, true, function (body) {
        for (var i = 0; i < data.modules.length; i++) {
          body.appendChild(buildSimpleItem(data.modules[i]));
        }
      }));
    }

    // UI Components
    if (data.uiComponents && data.uiComponents.length) {
      hasContent = true;
      fragment.appendChild(buildSection("UI Components", data.uiComponents.length, true, function (body) {
        for (var i = 0; i < data.uiComponents.length; i++) {
          var comp = data.uiComponents[i];
          body.appendChild(buildDetailItem(comp.name, comp.component));
        }
      }));
    }

    // data-mage-init
    if (data.mageInit && data.mageInit.length) {
      hasContent = true;
      fragment.appendChild(buildSection("data-mage-init", data.mageInit.length, true, function (body) {
        for (var i = 0; i < data.mageInit.length; i++) {
          var mi = data.mageInit[i];
          body.appendChild(buildExpandableItem(
            truncate(mi.selector, 60),
            truncate(mi.raw, 80),
            mi.raw
          ));
        }
      }));
    }

    // x-magento-init
    if (data.xMagentoInit && data.xMagentoInit.length) {
      hasContent = true;
      fragment.appendChild(buildSection("x-magento-init", data.xMagentoInit.length, true, function (body) {
        for (var i = 0; i < data.xMagentoInit.length; i++) {
          var xi = data.xMagentoInit[i];
          var detail = Array.isArray(xi.widgets) ? xi.widgets.join(", ") : "";
          var configStr = typeof xi.config === "string" ? xi.config : JSON.stringify(xi.config, null, 2);
          body.appendChild(buildExpandableItem(xi.selector, detail, configStr));
        }
      }));
    }

    if (!hasContent) {
      fragment.appendChild(el("div", "bbf__empty", "RequireJS found but no module data available."));
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

  window.BBF.renderers.lumajs = { render: render };
})();
