// Shared helpers for the extension's view tabs.

// Renders a consistent record header (primary name, entity logical name, GUID)
// into the given element. `extra` is an optional middle segment (e.g. form name).
function renderRecordHeader(el, info) {
  if (!el) return;
  info = info || {};

  var esc = function (text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  var primary = String(info.primaryName || "").trim();
  var entityName = String(info.entityName || "").trim();
  var recordId = String(info.recordId || "").replace(/[{}]/g, "");
  var extra = String(info.extra || "").trim();
  var extraLabel = String(info.extraLabel || "").trim();

  var label = function (text) {
    return text ? '<span class="record-pill-label">' + esc(text) + "</span>" : "";
  };

  var meta = [];
  if (entityName) meta.push('<span class="record-logical">' + label("entity") + esc(entityName) + "</span>");
  if (extra) meta.push('<span class="record-extra">' + label(extraLabel) + esc(extra) + "</span>");
  if (recordId) {
    meta.push(
      '<button type="button" class="record-id" title="Copy record id" data-guid="' +
        esc(recordId) +
        '">' +
        label("id") +
        esc(recordId) +
        '<span class="record-copy" aria-hidden="true">⧉</span></button>',
    );
  }

  var primaryText = primary || entityName || "Record";

  el.classList.add("record-header");
  el.innerHTML =
    '<span class="record-primary">' + esc(primaryText) + "</span>" + (meta.length ? '<span class="record-meta">' + meta.join("") + "</span>" : "");

  var copyBtn = el.querySelector(".record-id");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      navigator.clipboard.writeText(copyBtn.dataset.guid || "").then(function () {
        copyBtn.classList.add("copied");
        setTimeout(function () {
          copyBtn.classList.remove("copied");
        }, 1200);
      });
    });
  }
}
