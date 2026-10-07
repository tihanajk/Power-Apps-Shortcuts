var search;
var allButtons = [];
var entityName = "";
var locationFilter = "all";
var visibleOnly = false;
var libraryContents = {};

var LOC_LABELS = {
  form: "Form",
  view: "View",
  subgrid: "Subgrid",
  associated: "Associated",
  quickform: "Quick form",
  global: "Global",
  dashboard: "Dashboard",
  other: "Other",
};

document.addEventListener("DOMContentLoaded", function () {
  getRibbonResults();
  search = document.querySelector("input[name=filter]");
  search.addEventListener("input", function () {
    filterData();
  });

  document.querySelectorAll(".loc-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".loc-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      locationFilter = btn.dataset.loc;
      filterData();
    });
  });

  document.getElementById("visible-only").addEventListener("change", function (e) {
    visibleOnly = e.target.checked;
    filterData();
  });

  document.getElementById("downloadBtn").addEventListener("click", () => downloadData());
});

function escapeHtml(value) {
  if (value == null) return "";
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function getRibbonResults() {
  chrome.runtime.sendMessage({ action: "GET_RIBBON" }, function (response) {
    applyData(response && response.data);
  });
}

function applyData(data) {
  if (!data) {
    renderLoading("");
    return;
  }
  entityName = data.entity || entityName;
  document.getElementById("entity-name").textContent = "Ribbon — " + entityName;

  if (data.error) {
    renderError(data.error);
    return;
  }
  if (data.loading || !data.buttons) {
    renderLoading(entityName);
    return;
  }
  allButtons = data.buttons || [];
  libraryContents = data.libraryContents || {};
  render(allButtons);
}

function renderLoading(entity) {
  document.getElementById("entity-name").textContent = "Ribbon - " + (entity || "");
  document.getElementById("ribbon-content").innerHTML =
    '<div class="loading"><div class="spinner"></div><span>Retrieving ribbon definitions…</span></div>';
}

function renderError(message) {
  document.getElementById("ribbon-content").innerHTML = '<div class="error-message">' + escapeHtml(message) + "</div>";
}

// Results arrive asynchronously after the tab has already opened with a loading state.
chrome.runtime.onMessage.addListener(function (request) {
  if (request.action === "RIBBON_READY") {
    applyData(request.data);
  } else if (request.action === "WR_CONTENT_READY") {
    libraryContents[request.name] = request.content || "";
    var cbs = pendingWrCallbacks[request.name] || [];
    delete pendingWrCallbacks[request.name];
    cbs.forEach(function (cb) {
      cb(libraryContents[request.name]);
    });
  }
});

// Web resource sources are fetched lazily; callbacks waiting per web resource name.
var pendingWrCallbacks = {};

function requestWrContent(name, cb) {
  if (libraryContents[name] != null) {
    cb(libraryContents[name]);
    return;
  }
  if (!pendingWrCallbacks[name]) pendingWrCallbacks[name] = [];
  pendingWrCallbacks[name].push(cb);
  if (pendingWrCallbacks[name].length === 1) {
    chrome.runtime.sendMessage({ action: "REQUEST_WR_CONTENT", name: name, requestId: name });
  }
}

function buttonMatches(b, term) {
  if (!term) return true;
  var haystack = [
    b.label,
    b.id,
    b.commandId,
    b.tooltip,
    b.functions.map((f) => (f.functionName || "") + " " + (f.library ? f.library.name : "")).join(" "),
    b.enableRules.map((r) => r.id + " " + r.detail + " " + (r.functionName || "")).join(" "),
    b.displayRules.map((r) => r.id + " " + r.detail + " " + (r.functionName || "")).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(term);
}

function filterData() {
  var term = search.value.toLowerCase();
  render(allButtons.filter((b) => (!visibleOnly || b.visible) && locationMatches(b) && buttonMatches(b, term)));
}

function locationMatches(b) {
  if (locationFilter === "all") return true;
  return b.locations && b.locations.indexOf(locationFilter) !== -1;
}

function locationsCell(b) {
  if (!b.locations || b.locations.length === 0) return `<span class="muted">—</span>`;
  return b.locations.map((loc) => `<span class="loc-tag ${loc}">${LOC_LABELS[loc] || loc}</span>`).join("");
}

function visibleCell(b) {
  return b.visible ? `<span class="vis-tag yes">Visible</span>` : `<span class="vis-tag no">Hidden</span>`;
}

function functionsCell(b) {
  var parts = [];
  b.functions.forEach(function (f) {
    var fn = f.functionName ? `<span class="fn-name">${escapeHtml(f.functionName)}</span>` : `<span class="muted">(no function)</span>`;
    if (f.powerfx) {
      parts.push(fn + ` <span class="fx-tag">Power Fx</span>`);
    } else {
      var lib = f.library ? `<div>${codeLinkHtml(f.library, f.functionName)}</div>` : "";
      parts.push(fn + lib);
    }
  });
  b.urls.forEach(function (u) {
    parts.push(`<div><a href="${escapeHtml(u)}" target="_blank">${escapeHtml(u)}</a></div>`);
  });
  if (parts.length === 0) return `<span class="muted">—</span>`;
  return parts.join('<div style="height:6px"></div>');
}

// Registry of clickable web resource code links for the current render pass.
var codeLinks = [];

function codeLinkHtml(library, keyword) {
  if (!library) return "";
  var idx = codeLinks.length;
  codeLinks.push({ name: library.name, url: library.url, keyword: keyword || "" });
  return `<a href="#" class="wr-code-link" data-code="${idx}">${escapeHtml(library.name)}</a>`;
}

function ruleHtml(rule, kind) {
  var badge = `<span class="rule-kind ${kind}">${kind}</span>`;
  var detail = rule.detail
    ? `<span class="rule-detail">${escapeHtml(rule.detail)}</span>`
    : `<span class="rule-detail">${escapeHtml(rule.id)}</span>`;
  var link = "";
  if (rule.library) {
    link = `<div>${codeLinkHtml(rule.library, rule.functionName)}</div>`;
  }
  return `<div class="rule">${badge}${detail}${link}</div>`;
}

function visibilityCell(b) {
  var parts = [];
  b.enableRules.forEach((r) => parts.push(ruleHtml(r, "enable")));
  b.displayRules.forEach((r) => parts.push(ruleHtml(r, "display")));
  if (parts.length === 0) return `<span class="muted">Always visible / enabled</span>`;
  return parts.join("");
}

function render(buttons) {
  var content = `<div class="count">${buttons.length} button${buttons.length === 1 ? "" : "s"}</div>`;

  codeLinks = [];

  var rows = buttons
    .map(function (b) {
      var label = b.label ? escapeHtml(b.label) : `<span class="muted">(no label)</span>`;
      var cmd = b.hasDefinition ? escapeHtml(b.commandId) : `${escapeHtml(b.commandId)} <span class="muted">(no definition)</span>`;
      return `<tr>
          <td><span class="btn-label">${label}</span>${b.modern ? ' <span class="modern-tag">Modern</span>' : ""}${b.labelSource ? ` <span class="label-source" title="Where the label text comes from">${escapeHtml(b.labelSource)}</span>` : ""}<span class="btn-id">${escapeHtml(b.id)}</span></td>
          <td>${locationsCell(b)}</td>
          <td>${visibleCell(b)}</td>
          <td><span class="cmd-id">${cmd}</span></td>
          <td>${functionsCell(b)}</td>
          <td>${visibilityCell(b)}</td>
        </tr>`;
    })
    .join("");

  content += `
    <div class="table-container">
      <table id="main">
        <colgroup>
          <col class="col-button" />
          <col class="col-location" />
          <col class="col-visible" />
          <col class="col-command" />
          <col class="col-function" />
          <col class="col-visibility" />
        </colgroup>
        <thead>
          <tr>
            <th>Button</th>
            <th>Location</th>
            <th>Visible</th>
            <th>Command</th>
            <th>Function / Code</th>
            <th>Visibility logic</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  document.getElementById("ribbon-content").innerHTML = content;

  document.querySelectorAll("a.wr-code-link").forEach(function (link) {
    link.addEventListener("click", function (ev) {
      ev.preventDefault();
      var c = codeLinks[+link.getAttribute("data-code")];
      if (c) openWebResourceViewer(c);
    });
  });
}

function downloadData() {
  var rows = [];
  allButtons.forEach(function (b) {
    rows.push({
      Button: b.label || "",
      "Label Source": b.labelSource || "",
      "Button Id": b.id,
      Location: (b.locations || []).map((loc) => LOC_LABELS[loc] || loc).join(", "),
      Visible: b.visible ? "Yes" : "No",
      Command: b.commandId,
      "Has Definition": b.hasDefinition ? "Yes" : "No",
      Functions: b.functions
        .map((f) => f.functionName || "")
        .filter(Boolean)
        .join("; "),
      Libraries: b.functions
        .map((f) => (f.library ? f.library.name : ""))
        .filter(Boolean)
        .join("; "),
      Urls: b.urls.join("; "),
      "Enable Rules": b.enableRules.map((r) => r.detail || r.id).join("  ||  "),
      "Display Rules": b.displayRules.map((r) => r.detail || r.id).join("  ||  "),
    });
  });

  var ws = XLSX.utils.json_to_sheet(rows);
  var workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, "Ribbon");
  XLSX.writeFile(workbook, "ribbon_" + entityName + ".xlsx");
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordBoundaryRegex(keyword, flags) {
  return new RegExp("(?<![\\w$])" + escapeRegExp(keyword) + "(?![\\w$])", flags);
}

function highlightKeyword(code, keyword) {
  var escaped = escapeHtml(code);
  if (!keyword) return escaped;
  var re = keywordBoundaryRegex(escapeHtml(keyword), "gi");
  return escaped.replace(re, (match) => `<mark class="wr-highlight">${match}</mark>`);
}

function openWebResourceViewer(wr) {
  var existing = document.getElementById("wr-viewer-overlay");
  if (existing) existing.remove();

  var overlay = document.createElement("div");
  overlay.id = "wr-viewer-overlay";
  overlay.className = "wr-viewer-overlay";

  var modal = document.createElement("div");
  modal.className = "wr-viewer-modal";

  var head = document.createElement("div");
  head.className = "wr-viewer-head";
  head.innerHTML = `<div class="wr-viewer-title">${escapeHtml(wr.name)}</div>
    <div class="wr-viewer-nav">
      <span class="wr-viewer-counter">0 / 0</span>
      <button type="button" class="wr-viewer-prev" title="Previous match (Shift+Enter)" disabled>‹</button>
      <button type="button" class="wr-viewer-next" title="Next match (Enter)" disabled>›</button>
    </div>
    <button type="button" class="wr-viewer-download" title="Download file" disabled>⬇ Download</button>
    <button type="button" class="wr-viewer-close" title="Close">✕</button>`;

  var body = document.createElement("div");
  body.className = "wr-viewer-body";
  body.innerHTML = '<div class="loading"><div class="spinner"></div><span>Loading web resource…</span></div>';

  modal.appendChild(head);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  var marks = [];
  var currentIndex = 0;

  function close() {
    overlay.remove();
    document.removeEventListener("keydown", onKey, true);
  }
  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (marks.length) gotoMatch(currentIndex + (e.shiftKey ? -1 : 1));
    }
  }
  function gotoMatch(index) {
    if (!marks.length) return;
    currentIndex = ((index % marks.length) + marks.length) % marks.length;
    marks.forEach((m) => m.classList.remove("wr-highlight-active"));
    var mark = marks[currentIndex];
    mark.classList.add("wr-highlight-active");
    mark.scrollIntoView({ block: "center" });
    var counter = head.querySelector(".wr-viewer-counter");
    if (counter) counter.textContent = `${currentIndex + 1} / ${marks.length}`;
  }

  head.querySelector(".wr-viewer-close").addEventListener("click", close);
  overlay.addEventListener("mousedown", function (e) {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", onKey, true);

  function populate(content) {
    // Prefer highlighting the full function path; fall back to its short name if not found.
    var keyword = wr.keyword || "";
    if (keyword && content) {
      var full = keywordBoundaryRegex(keyword, "gi");
      if (!(content.match(full) || []).length && keyword.indexOf(".") !== -1) {
        keyword = keyword.split(".").pop();
      }
    }

    var matchCount = 0;
    if (keyword && content) {
      var re = keywordBoundaryRegex(keyword, "gi");
      matchCount = (content.match(re) || []).length;
    }

    body.innerHTML = "";
    var pre = document.createElement("pre");
    pre.className = "wr-viewer-code";
    pre.innerHTML = highlightKeyword(content || "", keyword);
    body.appendChild(pre);

    marks = Array.prototype.slice.call(pre.querySelectorAll("mark.wr-highlight"));
    currentIndex = 0;

    var counter = head.querySelector(".wr-viewer-counter");
    if (counter) counter.textContent = `${matchCount ? 1 : 0} / ${matchCount}`;

    var prevBtn = head.querySelector(".wr-viewer-prev");
    var nextBtn = head.querySelector(".wr-viewer-next");
    prevBtn.disabled = !matchCount;
    nextBtn.disabled = !matchCount;
    prevBtn.addEventListener("click", function () {
      if (marks.length) gotoMatch(currentIndex - 1);
    });
    nextBtn.addEventListener("click", function () {
      if (marks.length) gotoMatch(currentIndex + 1);
    });

    var dl = head.querySelector(".wr-viewer-download");
    dl.disabled = false;
    dl.addEventListener("click", function () {
      var fileName = wr.name.split("/").pop() || "webresource.txt";
      var blob = new Blob([content || ""], { type: "text/plain;charset=utf-8" });
      var downloadUrl = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);
    });

    if (marks.length) gotoMatch(0);
  }

  requestWrContent(wr.name, function (content) {
    // Ignore if the viewer was closed before the content arrived.
    if (!document.body.contains(overlay)) return;
    populate(content);
  });
}
