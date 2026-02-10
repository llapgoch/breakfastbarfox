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

  function truncate(str, len) {
    if (!str) return "";
    if (str.length <= len) return str;
    return str.substring(0, len) + "\u2026";
  }

  function render(container, data) {
    if (!data || !data.available) {
      container.innerHTML = '<div class="bbf__empty">No RequireJS / Luma JS found on this page.</div>';
      return;
    }

    var html = "";

    // RequireJS modules
    if (data.modules && data.modules.length) {
      html += renderSection("RequireJS Modules", data.modules.length, false, function () {
        var items = "";
        for (var i = 0; i < data.modules.length; i++) {
          items += '<div class="bbf-js__item">';
          items += '<span class="bbf-js__item-name">' + escapeHtml(data.modules[i]) + '</span>';
          items += '</div>';
        }
        return items;
      });
    }

    // UI Components
    if (data.uiComponents && data.uiComponents.length) {
      html += renderSection("UI Components", data.uiComponents.length, false, function () {
        var items = "";
        for (var i = 0; i < data.uiComponents.length; i++) {
          var comp = data.uiComponents[i];
          items += '<div class="bbf-js__item">';
          items += '<span class="bbf-js__item-name">' + escapeHtml(comp.name) + '</span>';
          if (comp.component) {
            items += '<span class="bbf-js__item-detail">' + escapeHtml(comp.component) + '</span>';
          }
          items += '</div>';
        }
        return items;
      });
    }

    // data-mage-init
    if (data.mageInit && data.mageInit.length) {
      html += renderSection("data-mage-init", data.mageInit.length, false, function () {
        var items = "";
        for (var i = 0; i < data.mageInit.length; i++) {
          var mi = data.mageInit[i];
          items += '<div class="bbf-js__item bbf-js__item--expandable" data-action="expand">';
          items += '<span class="bbf-js__item-name">' + escapeHtml(truncate(mi.selector, 60)) + '</span>';
          items += '<span class="bbf-js__item-detail">' + escapeHtml(truncate(mi.raw, 80)) + '</span>';
          items += '<div class="bbf-js__item-expanded">';
          items += '<pre class="bbf-js__pre">' + escapeHtml(mi.raw) + '</pre>';
          items += '</div>';
          items += '</div>';
        }
        return items;
      });
    }

    // x-magento-init
    if (data.xMagentoInit && data.xMagentoInit.length) {
      html += renderSection("x-magento-init", data.xMagentoInit.length, false, function () {
        var items = "";
        for (var i = 0; i < data.xMagentoInit.length; i++) {
          var xi = data.xMagentoInit[i];
          var detail = Array.isArray(xi.widgets) ? xi.widgets.join(", ") : "";
          var configStr = typeof xi.config === "string" ? xi.config : JSON.stringify(xi.config, null, 2);
          items += '<div class="bbf-js__item bbf-js__item--expandable" data-action="expand">';
          items += '<span class="bbf-js__item-name">' + escapeHtml(xi.selector) + '</span>';
          items += '<span class="bbf-js__item-detail">' + escapeHtml(detail) + '</span>';
          items += '<div class="bbf-js__item-expanded">';
          items += '<pre class="bbf-js__pre">' + escapeHtml(configStr) + '</pre>';
          items += '</div>';
          items += '</div>';
        }
        return items;
      });
    }

    if (!html) {
      html = '<div class="bbf__empty">RequireJS found but no module data available.</div>';
    }

    container.innerHTML = html;
    bindEvents(container);
  }

  function renderSection(title, count, collapsed, bodyFn) {
    var html = '<div class="bbf-js__section">';
    html += '<div class="bbf-js__section-header" data-action="toggle-section">';
    html += '<span class="bbf-js__arrow">' + (collapsed ? "\u25B6" : "\u25BC") + '</span> ';
    html += escapeHtml(title) + ' <span class="bbf-js__count">' + count + '</span>';
    html += '</div>';
    html += '<div class="bbf-js__section-body' + (collapsed ? ' is-collapsed' : '') + '">';
    html += bodyFn();
    html += '</div></div>';
    return html;
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
