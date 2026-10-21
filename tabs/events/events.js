var search;

var libraries = [];
var events = [];

document.addEventListener("DOMContentLoaded", function () {
  getEventsResults();
  search = document.querySelector("input[name=filter]");
  search.addEventListener("input", function () {
    filterData();
  });

  document.getElementById("downloadBtn").addEventListener("click", () => downloadData());
});

function downloadData() {
  // libraries
  var table = document.getElementById("main");
  var ws1 = XLSX.utils.table_to_sheet(table);

  // events
  var mainTable = document.getElementById("main-events");

  var tempTable = helper.handleComplexTable(mainTable, ["Event Name", "Attribute/Control"], ["Library Name", "Function Name", "Enabled"]);

  var ws2 = XLSX.utils.table_to_sheet(tempTable);

  var workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws1, "Libraries");
  XLSX.utils.book_append_sheet(workbook, ws2, "Events");
  XLSX.writeFile(workbook, `events.xlsx`);
}

function filterData() {
  var searchTerm = search.value.toLowerCase();

  var filteredLibraries = [];

  for (var item of libraries) {
    for (var key in item) {
      var value = item[key]?.toLowerCase();
      if (value?.includes(searchTerm)) {
        filteredLibraries.push(item);
        break;
      }
    }
  }

  handleLibraries(filteredLibraries);

  var filteredEvents = [];

  for (var item of events) {
    for (var key in item) {
      if (key == "handlers") {
        var handlers = item[key];
        var found = false;

        var handlerItems = [];
        for (var handler of handlers) {
          for (var k in handler) {
            var value = handler[k]?.toLowerCase();
            if (value?.includes(searchTerm)) {
              handlerItems.push(handler);
              if (!found) found = true;
              break;
            }
          }
        }

        if (found) {
          filteredEvents.push({ ...item, handlers: handlerItems });
          break;
        }
      } else {
        var value = item[key]?.toLowerCase();
        if (value?.includes(searchTerm)) {
          filteredEvents.push(item);
          break;
        }
      }
    }
  }

  handleEvents(filteredEvents);
}

function getEventsResults() {
  chrome.runtime.sendMessage(
    {
      action: "GET_FORM_EVENTS",
    },
    function (response) {
      var data = response.data;

      console.log(data);

      document.getElementById("form-name").innerHTML = data.name;

      libraries = data.libraries;
      events = data.events;

      handleLibraries(libraries);
      handleEvents(events);
    },
  );
}
function handleEvents(events) {
  var content = "<h2>Events</h2>";

  // if (events.length == 0) content += "No data";
  // else {
  var table = `
    <div class="table-container">
    <div class="table-wrapper">
      <table id="main-events">                        
        <thead>
          <tr>
            <th>Name</th>
            <th>Attribute/Control</th>
            <th style="width: 60%">Handlers</th>
          </tr>
        </thead>
        <tbody>
          ${
            events &&
            events
              .map(
                (e) =>
                  `<tr>
            <td>${e.name}</td>
            <td>${e.attribute ?? ""}</td>
            <td> ${makeMiniTable(e.handlers)}</td>
            </tr>`,
              )
              .join("")
          }
        </tbody>
      </table>
    </div>
  </div>`;

  content += table;
  // }
  document.getElementById("events-content").innerHTML = content;
}

function makeMiniTable(handlers) {
  var mini = `<table id="mini">
              <thead>
                <tr>
                  <th>Library Name</th>
                  <th>Function Name</th>
                  <th>Enabled</th>
                  <th>Parameters</th>
                </tr>
              </thead>
              <tbody>
              ${handlers
                .map(
                  (v) =>
                    `<tr id="mini-row">
                      <td>${v?.libraryName}</td>
                      <td>${v?.functionName}</td>
                      <td>${v?.enabled}</td>
                      <td>${v?.parameters || "-"}</td>
                  </tr>
                </tbody>`,
                )
                .join("")}
            </table>`;
  return mini;
}

function handleLibraries(libraries) {
  var content = "<h2>Libraries</h2>";

  // if (libraries.length == 0) content += "No data";
  // else {
  var table = `
    <div class="table-container">
    <div class="table-wrapper">
      <table id="main">                        
        <thead>
          <tr>
            <th>Name</th>
            <th>Id</th>
          </tr>
        </thead>
        <tbody>
          ${libraries
            .map(
              (l) => `<tr>
            <td>
              <a href='#' class='wr-code-link' data-name='${escapeHtml(l.name)}'>${escapeHtml(l.name)}</a>
            </td>            
            <td>${l.libraryUniqueId}</td></tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>`;

  content += table;
  // }

  document.getElementById("libraries-content").innerHTML = content;

  document.querySelectorAll("a.wr-code-link").forEach(function (link) {
    link.addEventListener("click", function (ev) {
      ev.preventDefault();
      openWebResourceViewer({ name: link.getAttribute("data-name") });
    });
  });
}

// Web resource sources are fetched lazily; cache and per-name callbacks pending a response.
var libraryContents = {};
var pendingWrCallbacks = {};

chrome.runtime.onMessage.addListener(function (request) {
  if (request.action === "WR_CONTENT_READY") {
    libraryContents[request.name] = request.content || "";
    var cbs = pendingWrCallbacks[request.name] || [];
    delete pendingWrCallbacks[request.name];
    cbs.forEach(function (cb) {
      cb(libraryContents[request.name]);
    });
  }
});

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

function escapeHtml(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
    <button type="button" class="wr-viewer-download" title="Download file" disabled>⬇ Download</button>
    <button type="button" class="wr-viewer-close" title="Close">✕</button>`;

  var body = document.createElement("div");
  body.className = "wr-viewer-body";
  body.innerHTML = '<div class="loading"><div class="spinner"></div><span>Loading web resource…</span></div>';

  modal.appendChild(head);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
    document.removeEventListener("keydown", onKey, true);
  }
  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }
  head.querySelector(".wr-viewer-close").addEventListener("click", close);
  overlay.addEventListener("mousedown", function (e) {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", onKey, true);

  function populate(content) {
    body.innerHTML = "";
    var pre = document.createElement("pre");
    pre.className = "wr-viewer-code";
    pre.textContent = content || "";
    body.appendChild(pre);

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
  }

  requestWrContent(wr.name, function (content) {
    // Ignore if the viewer was closed before the content arrived.
    if (!document.body.contains(overlay)) return;
    populate(content);
  });
}
