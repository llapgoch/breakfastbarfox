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
      container.innerHTML = '<div class="bbf__empty">No Alpine.js found on this page.</div>';
      return;
    }

    var html = "";

    // Version badge
    if (data.version) {
      html += '<div class="bbf-js__badge">Alpine.js v' + escapeHtml(data.version) + '</div>';
    }

    // Components
    if (data.components && data.components.length) {
      html += '<div class="bbf-js__section">';
      html += '<div class="bbf-js__section-header" data-action="toggle-section">';
      html += '<span class="bbf-js__arrow">\u25BC</span> ';
      html += 'Components <span class="bbf-js__count">' + data.components.length + '</span>';
      html += '</div>';
      html += '<div class="bbf-js__section-body">';

      for (var i = 0; i < data.components.length; i++) {
        var comp = data.components[i];
        html += '<div class="bbf-js__item bbf-js__item--expandable" data-action="expand">';
        html += '<span class="bbf-js__item-name">' + escapeHtml(comp.label) + '</span>';
        if (comp.xData) {
          html += '<span class="bbf-js__item-detail">' + escapeHtml(truncate(comp.xData, 80)) + '</span>';
        }
        if (comp.liveData) {
          html += '<div class="bbf-js__item-expanded">';
          html += '<pre class="bbf-js__pre">' + escapeHtml(comp.liveData) + '</pre>';
          html += '</div>';
        }
        html += '</div>';
      }

      html += '</div></div>';
    }

    // Stores
    if (data.stores && Object.keys(data.stores).length) {
      var storeKeys = Object.keys(data.stores);
      html += '<div class="bbf-js__section">';
      html += '<div class="bbf-js__section-header" data-action="toggle-section">';
      html += '<span class="bbf-js__arrow">\u25BC</span> ';
      html += 'Stores <span class="bbf-js__count">' + storeKeys.length + '</span>';
      html += '</div>';
      html += '<div class="bbf-js__section-body">';

      for (var j = 0; j < storeKeys.length; j++) {
        var storeName = storeKeys[j];
        html += '<div class="bbf-js__item bbf-js__item--expandable" data-action="expand">';
        html += '<span class="bbf-js__item-name">' + escapeHtml(storeName) + '</span>';
        html += '<span class="bbf-js__item-detail">store</span>';
        html += '<div class="bbf-js__item-expanded">';
        html += '<pre class="bbf-js__pre">' + escapeHtml(data.stores[storeName]) + '</pre>';
        html += '</div>';
        html += '</div>';
      }

      html += '</div></div>';
    }

    if (!html) {
      html = '<div class="bbf__empty">Alpine.js detected but no component data found.</div>';
    }

    container.innerHTML = html;
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
