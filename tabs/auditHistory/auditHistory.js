var search;
var allRecords = [];
var baseUrl = "";
var sortDir = "desc";
var lastRecords = [];

document.addEventListener("DOMContentLoaded", function () {
  getAuditResults();
  search = document.querySelector("input[name=filter]");
  search.addEventListener("input", function () {
    filterData();
  });

  document.getElementById("downloadBtn").addEventListener("click", () => downloadData());

  document.querySelectorAll("input[name=eventFilter]").forEach(function (cb) {
    cb.addEventListener("change", function () {
      filterData();
    });
  });
});

function downloadData() {
  var table = document.getElementById("main");
  var ws = XLSX.utils.table_to_sheet(table);
  var workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, "Audit History");
  XLSX.writeFile(workbook, "audit_history.xlsx");
}

function getAuditResults() {
  chrome.runtime.sendMessage(
    {
      action: "GET_AUDIT_HISTORY",
    },
    function (response) {
      var data = response.data;
      baseUrl = data.url;
      document.getElementById("record-name").innerHTML = data.entityName + " - Audit History";
      allRecords = data.records;
      renderResults(allRecords);

      if (response.last) {
        setLoading(false);
        return;
      }

      getAuditResults();
    },
  );
}

function setLoading(isLoading) {
  var indicator = document.getElementById("loading-indicator");
  if (indicator) indicator.style.display = isLoading ? "flex" : "none";
}

function filterData() {
  var term = search.value.toLowerCase();

  var checkedEvents = [];
  document.querySelectorAll("input[name=eventFilter]:checked").forEach(function (cb) {
    checkedEvents.push(cb.value.toLowerCase());
  });

  var filtered = allRecords.filter(function (r) {
    var op = (r.operation || "").toLowerCase();
    if (checkedEvents.length > 0 && !checkedEvents.includes(op)) return false;

    if (!term) return true;

    return (
      op.includes(term) ||
      (r.field || "").toLowerCase().includes(term) ||
      (r.newValue || "").toLowerCase().includes(term) ||
      (r.oldValue || "").toLowerCase().includes(term) ||
      (r.createdOn || "").toLowerCase().includes(term) ||
      (r.user || "").toLowerCase().includes(term)
    );
  });

  renderResults(filtered);
}

function renderResults(records) {
  var content = `<div class="summary">Records: ${records.length}</div>`;

  var groups = [];
  records.forEach(function (r, idx) {
    var auditId = r.auditId;

    var keyIndex = groups.findIndex((g) => g.key == auditId);
    if (keyIndex != -1) {
      groups[keyIndex].rows.push(r);
    } else {
      groups.push({ key: auditId, rows: [r] });
    }
  });

  groups.sort(function (a, b) {
    var da = new Date(a.rows[0].createdOnRaw || a.rows[0].createdOn).getTime();
    var db = new Date(b.rows[0].createdOnRaw || b.rows[0].createdOn).getTime();
    if (isNaN(da)) da = 0;
    if (isNaN(db)) db = 0;
    return sortDir === "asc" ? da - db : db - da;
  });

  var bodyRows = groups
    .map(function (g, gi) {
      var groupClass = gi % 2 === 0 ? "tx-group-even" : "tx-group-odd";
      var rowspan = g.rows.length;
      return g.rows
        .map(function (r, ri) {
          var sharedCells =
            ri === 0
              ? `<td rowspan="${rowspan}">${r.createdOn}</td>
              <td rowspan="${rowspan}">${r.user}</td>
              <td rowspan="${rowspan}"><span class="event-badge event-${(r.operation || "").toLowerCase().replace(/\s/g, "")}">${r.operation}</span></td>`
              : "";
          var openCell =
            ri === 0
              ? `<td rowspan="${rowspan}"><a class="open-link" href="${baseUrl}/tools/audit/audit_details.aspx?id=%7b${r.auditId}%7d" target="_blank">Open</a></td>`
              : "";
          return `<tr class="${groupClass}">
              ${sharedCells}
              <td>${r.field}</td>
              <td class="wrap-cell">${r.oldValue}</td>
              <td class="wrap-cell">${r.newValue}</td>
              ${openCell}
            </tr>`;
        })
        .join("");
    })
    .join("");

  var table = `
  <div class="table-container">
    <div class="table-wrapper">
      <table id="main">
        <thead>
          <tr>
            <th id="sortDateHeader" class="sortable">Changed Date <span class="sort-arrow">${sortDir === "asc" ? "▲" : "▼"}</span></th>
            <th>Changed By</th>
            <th>Event</th>
            <th>Changed Field</th>
            <th>Old Value</th>
            <th>New Value</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  </div>`;

  content += table;
  document.getElementById("audit-content").innerHTML = content;

  lastRecords = records;
  var dateHeader = document.getElementById("sortDateHeader");
  if (dateHeader) {
    dateHeader.addEventListener("click", function () {
      sortDir = sortDir === "asc" ? "desc" : "asc";
      renderResults(lastRecords);
    });
  }

  makeColumnsResizable();
}

function makeColumnsResizable() {
  var table = document.getElementById("main");
  if (!table) return;

  var headers = table.querySelectorAll("thead th");
  headers.forEach(function (th) {
    var handle = document.createElement("span");
    handle.className = "col-resizer";
    th.appendChild(handle);

    var startX, startWidth;

    handle.addEventListener("mousedown", function (e) {
      startX = e.pageX;
      startWidth = th.offsetWidth;
      handle.classList.add("resizing");
      e.preventDefault();
      e.stopPropagation();

      function onMouseMove(ev) {
        var newWidth = startWidth + (ev.pageX - startX);
        if (newWidth < 40) newWidth = 40;
        th.style.width = newWidth + "px";
      }

      function onMouseUp() {
        handle.classList.remove("resizing");
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    // Prevent sort toggle when clicking the resizer
    handle.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  });
}
