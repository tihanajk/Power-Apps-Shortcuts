document.addEventListener("DOMContentLoaded", function () {
  search = document.querySelector("input[name=filter]");
  exceptionsOnly = document.querySelector("input[name=exceptionsOnly]");
  syncOnly = document.querySelector("input[name=syncOnly]");

  search.addEventListener("input", render);
  exceptionsOnly.addEventListener("change", render);
  syncOnly.addEventListener("change", render);
  document.getElementById("downloadBtn").addEventListener("click", function () {
    paTable.exportTable(document.getElementById("main"), "Trace logs", "plugin_trace_logs.xlsx");
  });

  document.getElementById("load-more").addEventListener("click", loadMore);
  document.getElementById("range-apply").addEventListener("click", applyRange);
  ["range-from", "range-to"].forEach(function (id) {
    document.getElementById(id).addEventListener("keydown", function (e) {
      if (e.key === "Enter") applyRange();
    });
  });

  chrome.runtime.onMessage.addListener(function (request) {
    if (request.action === "TRACE_LOGS_READY") applyData(request.data);
    else if (request.action === "TRACE_LOGS_PAGE") applyPage(request.data);
  });

  chrome.runtime.sendMessage({ action: "GET_TRACE_LOGS" }, function (response) {
    applyData(response && response.data);
  });
});

var search;
var exceptionsOnly;
var syncOnly;
var logs = [];
var meta = {};
var correlationFilter = "";
var sortState = { key: "createdOn", dir: -1 };
var nextLink = "";
var loadingMore = false;
var pageError = "";

function escapeHtml(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applyData(data) {
  if (!data) return;
  meta = data;
  renderScope();
  if (data.loading) return;

  document.getElementById("range-apply").disabled = false;
  document.getElementById("range-from").value = toLocalInput(data.from);
  document.getElementById("range-to").value = toLocalInput(data.to);

  if (data.error) {
    document.getElementById("trace-content").innerHTML = `<div class="error">⚠️ Couldn't load trace logs: ${escapeHtml(data.error)}</div>`;
    return;
  }

  logs = data.logs || [];
  nextLink = data.nextLink || "";
  loadingMore = false;
  pageError = "";
  correlationFilter = "";
  if (data.exceptionsOnly) exceptionsOnly.checked = true;
  renderSettingBanner(data.setting);
  render();
}

// ISO string <-> "YYYY-MM-DDTHH:mm" in local time for <input type="datetime-local">.
function toLocalInput(iso) {
  var d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return "";
  var pad = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function fromLocalInput(value) {
  var d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? d.toISOString() : "";
}

// Re-queries Dataverse with the same entity/plugin filters and the new date range.
function applyRange() {
  var btn = document.getElementById("range-apply");
  if (btn.disabled) return;
  var from = fromLocalInput(document.getElementById("range-from").value);
  var to = fromLocalInput(document.getElementById("range-to").value);
  if (from && to && from > to) {
    var swap = from;
    from = to;
    to = swap;
  }
  btn.disabled = true;
  meta = Object.assign({}, meta, { from: from, to: to });
  renderScope();
  nextLink = "";
  document.getElementById("load-more").classList.add("hidden");
  document.getElementById("trace-content").innerHTML = '<div class="loading"><span class="spinner"></span><span>Loading trace logs...</span></div>';
  chrome.runtime.sendMessage({
    action: "TRACE_LOGS_RELOAD",
    filters: { entity: meta.entity, plugin: meta.plugin, exceptionsOnly: meta.exceptionsOnly, from: from, to: to },
  });
}

function applyPage(data) {
  if (!data) return;
  loadingMore = false;
  pageError = data.error || "";
  if (!data.error) {
    var known = {};
    logs.forEach((l) => (known[l.id] = true));
    logs = logs.concat((data.logs || []).filter((l) => !known[l.id]));
  }
  nextLink = data.nextLink || "";
  render();
}

function loadMore() {
  if (!nextLink || loadingMore) return;
  loadingMore = true;
  pageError = "";
  renderPaging();
  chrome.runtime.sendMessage({ action: "TRACE_LOGS_NEXT", nextLink: nextLink });
}

function renderPaging() {
  var btn = document.getElementById("load-more");
  var size = meta.pageSize || 250;
  btn.classList.toggle("hidden", !nextLink);
  btn.disabled = loadingMore;
  btn.textContent = loadingMore ? "Loading…" : "Load next " + size;
  var loaded = document.getElementById("loaded");
  loaded.innerHTML = pageError
    ? `<span class="page-error">⚠️ ${escapeHtml(pageError)}</span>`
    : logs.length
      ? `${logs.length} loaded${nextLink ? "" : " · all loaded"}`
      : "";
}

function formatDateTime(iso) {
  var d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

function rangeLabel(from, to) {
  if (!from && !to) return "Any time";
  if (from && !to) return formatDateTime(from) + " → now";
  if (!from) return "Until " + formatDateTime(to);
  return formatDateTime(from) + " → " + formatDateTime(to);
}

function renderScope() {
  var parts = [
    `<span class="scope-pill"><span class="scope-label">Entity</span>${escapeHtml(meta.entity || "All")}</span>`,
    `<span class="scope-pill"><span class="scope-label">Plugin</span>${escapeHtml(meta.plugin ? shortTypeName(meta.plugin) : "All")}</span>`,
    `<span class="scope-pill"><span class="scope-label">Created</span>${escapeHtml(rangeLabel(meta.from, meta.to))}</span>`,
  ];
  if (meta.pageSize) parts.push(`<span class="scope-pill"><span class="scope-label">Page</span>${meta.pageSize} newest at a time</span>`);
  document.getElementById("scope").innerHTML = parts.join("");
}

function renderSettingBanner(setting) {
  var el = document.getElementById("setting-banner");
  if (setting === 0) {
    el.className = "setting-banner warn";
    el.innerHTML =
      "⚠️ Plug-in trace logging is <b>Off</b> in this environment, so no new logs are written. Turn it on in <i>Settings › Administration › System Settings › Customization › Enable logging to plug-in trace log</i>.";
  } else if (setting === 1) {
    el.className = "setting-banner info";
    el.innerHTML = "ℹ️ Plug-in trace logging is set to <b>Exception</b>, so only failing executions are logged.";
  } else {
    el.className = "setting-banner hidden";
  }
}

function filteredLogs() {
  var term = (search.value || "").trim().toLowerCase();
  return logs.filter(function (l) {
    if (exceptionsOnly.checked && !l.exception) return false;
    if (syncOnly.checked && l.mode !== "Sync") return false;
    if (correlationFilter && l.correlationId !== correlationFilter) return false;
    if (!term) return true;
    return [l.typeName, l.message, l.entity, l.correlationId, l.requestId, l.exception, l.messageBlock].some(function (v) {
      return (v || "").toLowerCase().includes(term);
    });
  });
}

// "Namespace.Class, Assembly, Version=..." -> "Namespace.Class"
function shortTypeName(typeName) {
  return String(typeName || "").split(",")[0];
}

function render() {
  renderPaging();
  var rows = filteredLogs();
  paTable.sortRows(rows, sortState);

  var exceptions = rows.filter((r) => r.exception).length;
  document.getElementById("count").innerHTML =
    `count: ${rows.length}` + (exceptions ? ` · <span class="count-exc">${exceptions} exception${exceptions > 1 ? "s" : ""}</span>` : "");

  var cf = document.getElementById("correlation-filter");
  if (correlationFilter) {
    cf.classList.remove("hidden");
    cf.innerHTML = `Correlation <code>${escapeHtml(correlationFilter.slice(0, 8))}…</code> <button type="button" title="Clear correlation filter">✕</button>`;
    cf.querySelector("button").addEventListener("click", function () {
      correlationFilter = "";
      render();
    });
  } else {
    cf.classList.add("hidden");
  }

  var content = document.getElementById("trace-content");
  if (!rows.length) {
    content.innerHTML = `<div class="empty">${
      logs.length ? "No loaded trace logs match the filters." + (nextLink ? " Try loading the next page." : "") : "No trace logs found for this scope."
    }</div>`;
    return;
  }

  var a = (k) => paTable.arrow(sortState, k);
  content.innerHTML = `
  <div class="table-container">
    <div class="table-wrapper">
      <table id="main">
        <thead>
          <tr>
            <th class="col-idx"></th>
            <th class="sortable col-created" data-sort="createdOn">Created on${a("createdOn")}</th>
            <th class="sortable col-type" data-sort="typeName">Plugin / activity${a("typeName")}</th>
            <th class="sortable col-message" data-sort="message">Message${a("message")}</th>
            <th class="sortable col-entity" data-sort="entity">Entity${a("entity")}</th>
            <th class="sortable col-mode" data-sort="mode">Mode${a("mode")}</th>
            <th class="sortable col-depth" data-sort="depth">Depth${a("depth")}</th>
            <th class="sortable col-duration" data-sort="duration">Duration${a("duration")}</th>
            <th class="sortable col-result" data-sort="exception">Result${a("exception")}</th>
            <th class="col-correlation">Correlation</th>
            <th class="col-details"></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(rowHtml).join("")}
        </tbody>
      </table>
    </div>
  </div>`;

  var table = document.getElementById("main");
  paTable.bindSortHeaders(table, sortState, render);
  paTable.makeResizable(table);

  content.querySelectorAll(".corr-link").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      correlationFilter = link.getAttribute("data-corr");
      render();
    });
  });

  content.querySelectorAll(".details-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var log = logs.find((l) => l.id === btn.getAttribute("data-id"));
      if (log) showDetails(log);
    });
  });
}

function rowHtml(l, i) {
  var created = escapeHtml(l.createdOnDisplay);
  var corr = escapeHtml(l.correlationId);
  return `<tr class="${l.exception ? "row-exc" : ""}">
    <td>${i + 1}</td>
    <td data-v="${created}" title="${created}">${created}</td>
    <td data-v="${escapeHtml(l.typeName)}" title="${escapeHtml(l.typeName)}">${escapeHtml(shortTypeName(l.typeName))}${
      l.operation === "Workflow activity" ? ' <span class="sub-tag">activity</span>' : ""
    }</td>
    <td>${escapeHtml(l.message)}</td>
    <td class="entity">${escapeHtml(l.entity)}</td>
    <td data-v="${escapeHtml(l.mode)}">${l.mode ? `<span class="mode-pill ${l.mode.toLowerCase()}">${l.mode}</span>` : ""}</td>
    <td>${l.depth ?? ""}</td>
    <td data-v="${l.duration ?? ""}" class="num">${l.duration != null ? l.duration + " ms" : ""}</td>
    <td data-v="${l.exception ? "Exception" : "Success"}">${
      l.exception ? '<span class="result-pill exc">Exception</span>' : '<span class="result-pill ok">Success</span>'
    }</td>
    <td data-v="${corr}">${
      l.correlationId
        ? `<a href="#" class="corr-link" data-corr="${corr}" title="Show only this correlation (${corr})"><code>${escapeHtml(l.correlationId.slice(0, 8))}…</code></a>`
        : ""
    }</td>
    <td data-v=""><button type="button" class="details-btn" data-id="${escapeHtml(l.id)}">Details</button></td>
  </tr>`;
}

function showDetails(l) {
  var lines = [
    "Plugin:        " + l.typeName,
    "Message:       " + l.message + (l.entity ? " (" + l.entity + ")" : ""),
    "Mode / depth:  " + l.mode + " / " + (l.depth ?? ""),
    "Created on:    " + l.createdOnDisplay,
    "Duration:      " + (l.duration != null ? l.duration + " ms" : ""),
    "Correlation:   " + l.correlationId,
    "Request:       " + l.requestId,
    "Step id:       " + l.stepId,
  ];
  if (l.exception) lines.push("", "===== Exception =====", l.exception);
  lines.push("", "===== Message block =====", l.messageBlock || "(empty)");

  var title = (l.exception ? "❌ " : "") + shortTypeName(l.typeName) + " — " + l.message;
  if (window.paShowCode) window.paShowCode(title, lines.join("\n"), "trace.log");
}
