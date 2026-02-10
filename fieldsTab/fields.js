var allFields = [];
var search;
var checkboxForm;

document.addEventListener("DOMContentLoaded", function () {
  getFieldsResults();

  search = document.querySelector("input[name=filter]");
  search.addEventListener("input", function () {
    filterFields();
  });

  checkboxForm = document.querySelector("input[name=formOnly]");
  checkboxForm.addEventListener("change", function () {
    filterFields();
  });

  document.getElementById("downloadBtn").addEventListener("click", () => downloadData());
});

function downloadData() {
  var table = document.getElementById("main");

  var sheetName = document.getElementById("entity-name").innerHTML;

  const workbook = XLSX.utils.table_to_book(table, { sheet: sheetName });
  XLSX.writeFile(workbook, `allfields.xlsx`);
}

function getFieldsResults() {
  chrome.runtime.sendMessage(
    {
      action: "GET_ALL_FIELDS",
    },
    function (response) {
      document.getElementById("entity-name").innerHTML = response.entityName.toUpperCase();

      allFields = response.fields;
      renderResults(allFields);
    },
  );
}

function filterFields() {
  var searchFilter = search.value.toLowerCase();
  var formOnly = checkboxForm.checked;

  var filtered = allFields.filter(
    (f) =>
      (!formOnly || (formOnly && f.onForm)) &&
      (f.name.includes(searchFilter) || (f.value && f.value.toString().toLowerCase().includes(searchFilter))),
  );

  renderResults(filtered);
}

function renderResults(data) {
  var content = `<div>count: ${data.length}</div`;

  var table = `
  <div class="table-container">
    <div class="table-wrapper">
      <table id="main">                        
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          ${data
            .map(
              (d) =>
                `<tr><td>${d.name}${d.onForm ? " 🟢" : ""}${d?.behavior == 1 ? " ©️" : d?.behavior == 2 ? " ®️" : d?.behavior == 3 ? " 🌀" : ""}</td><td>${
                  d.value == null ? "" : d.value
                }</td></tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>`;

  content += table;

  document.getElementById("fields-content").innerHTML = content;
}
