var search;
var allRecords = [];
var baseUrl = "";

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

      if (response.last) return;

      getAuditResults();
    },
  );
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

  var table = `
  <div class="table-container">
    <div class="table-wrapper">
      <table id="main">
        <thead>
          <tr>
            <th>Changed Date</th>
            <th>Changed By</th>
            <th>Event</th>
            <th>Changed Field</th>
            <th>Old Value</th>
            <th>New Value</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${records
            .map(
              (r) =>
                `<tr>
              <td>${r.createdOn}</td>
              <td>${r.user}</td>
              <td><span class="event-badge event-${(r.operation || "").toLowerCase().replace(/\s/g, "")}">${r.operation}</span></td>
              <td>${r.field}</td>
              <td>${r.oldValue}</td>
              <td>${r.newValue}</td>
              <td><a class="open-link" href="${baseUrl}/tools/audit/audit_details.aspx?id=%7b${r.auditId}%7d" target="_blank">Open</a></td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>`;

  content += table;
  document.getElementById("audit-content").innerHTML = content;
}
