document.addEventListener("DOMContentLoaded", function () {
  getFetchResults();
});

function getFetchResults() {
  chrome.runtime.sendMessage(
    {
      action: "GET_FETCH",
    },
    function (response) {
      console.log(response);
      var content = renderResults(response.fetchData, response.fetchEntityName);

      document.getElementById("fetch-content").innerHTML = content;
    }
  );
}

function renderResults(fetchData, entityName) {
  var content = `<h1>Fetched data for entity ${entityName.toUpperCase()}</h1>`;

  if (fetchData.entities.length == 0) {
    content += "<div>No data</div>";
    return content;
  }

  content += `<div>count: ${fetchData.entities.length}</div>`;

  var first = fetchData.entities[0];
  var columns = ["_"];
  for (const [key, value] of Object.entries(first)) {
    if (key == "@odata.etag") continue;
    columns.push(key);
  }
  console.log(columns);

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
            .map(
              (r) =>
                `<tr id="main-row">${columns
                  .map((c) => (c == "_" ? `<td>${fetchData.entities.indexOf(r) + 1}</td>` : `<td>${r[c]}</td>`))
                  .join("")}</tr>`
            )
            .join("")}
          </tbody>
      </table>
    </div>
  </div>`;

  content += table;
  return content;
}
