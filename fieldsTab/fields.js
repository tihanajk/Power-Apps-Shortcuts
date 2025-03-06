var allFields = [];

document.addEventListener("DOMContentLoaded", function () {
  getFieldsResults();
});

function getFieldsResults() {
  chrome.runtime.sendMessage(
    {
      action: "GET_ALL_FIELDS",
    },
    function (response) {
      console.log(response);

      document.getElementById("entity-name").innerHTML = response.entityName.toUpperCase();

      allFields = response.allFields;
      renderResults(allFields);
    }
  );
}

var search = document.querySelector("input[name=filter]");
search.addEventListener("input", function () {
  filterFields();
});

function filterFields() {
  var searchFilter = search.value.toLowerCase();

  var filtered = Object.fromEntries(
    Object.entries(allFields).filter(
      ([key, value]) => key.toLowerCase().includes(searchFilter) || value?.toString().toLowerCase().includes(searchFilter)
    )
  );

  renderResults(filtered);
}

function renderResults(data) {
  var content = `<div>count: ${Object.entries(data).length}</div`;

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
          ${Object.entries(data)
            .map(([key, value]) => `<tr><td>${key}</td><td>${value == null ? "" : value}</td></tr>`)
            .join("")}
        </tbody>
      </table>
    </div>
  </div>`;

  content += table;

  document.getElementById("fields-content").innerHTML = content;
}
