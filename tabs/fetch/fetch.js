document.addEventListener("DOMContentLoaded", function () {
  getFetchResults();

  var search = document.querySelector("input[name=filter]");
  if (search) {
    search.addEventListener("input", function () {
      filterResults(search.value.toLowerCase());
    });
  }
});

function filterResults(term) {
  var table = document.getElementById("main");
  if (!table) return;

  var rows = table.querySelectorAll("tbody tr");
  rows.forEach(function (row) {
    var text = row.innerText.toLowerCase();
    row.style.display = !term || text.includes(term) ? "" : "none";
  });
}

function getFetchResults() {
  chrome.runtime.sendMessage(
    {
      action: "GET_FETCH",
    },
    function (response) {
      var content = renderResults(response.fetchData, response.fetchEntityName, response.url);

      document.getElementById("fetch-content").innerHTML = content;

      var fetchContent = document.getElementById("fetch-content");
      fetchContent.addEventListener("click", function (e) {
        var row = e.target.closest("tr.clickable");
        if (!row) return;
        var recordUrl = row.getAttribute("data-url");
        if (recordUrl) window.open(recordUrl, "_blank");
      });
    },
  );

  document.getElementById("downloadBtn").addEventListener("click", () => downloadData());
}

function downloadData() {
  var table = document.getElementById("main");

  var sheetName = document.getElementById("title").innerHTML;
  const workbook = XLSX.utils.table_to_book(table, { sheet: sheetName });
  XLSX.writeFile(workbook, `fetchresults.xlsx`);
}

function renderResults(fetchData, entityName, url) {
  var content = "";

  document.getElementById("title").innerHTML = `Fetched data for entity ${entityName.toUpperCase()}`;

  if (fetchData.entities.length == 0) {
    content += "<div>No data</div>";
    return content;
  }

  content += `<div class="count">count: ${fetchData.entities.length}</div>`;

  var first = fetchData.entities[0];
  var columns = ["_"];
  for (const [key, value] of Object.entries(first)) {
    if (key == "@odata.etag") continue;
    columns.push(key);
  }

  var primaryIdField = entityName + "id";

  function getRecordId(r) {
    if (r[primaryIdField]) return r[primaryIdField];
    var guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const [key, value] of Object.entries(r)) {
      if (key.endsWith("id") && typeof value === "string" && guidRegex.test(value)) return value;
    }
    return null;
  }

  var table = `
  <div class="table-container">
    <div class="table-wrapper">
      <table id="main">                        
          <thead>
            <tr>
            ${columns.map((c) => `<th>${c}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
          ${fetchData.entities
            .map((r) => {
              var recordId = getRecordId(r);
              var recordUrl = url && recordId ? `${url}/main.aspx?pagetype=entityrecord&etn=${entityName}&id=${recordId}` : "";
              return `<tr id="main-row"${recordUrl ? ` class="clickable" data-url="${recordUrl}"` : ""}>${columns
                .map((c) => (c == "_" ? `<td>${fetchData.entities.indexOf(r) + 1}</td>` : `<td>${r[c]}</td>`))
                .join("")}</tr>`;
            })
            .join("")}
          </tbody>
      </table>
    </div>
  </div>`;

  content += table;
  return content;
}
