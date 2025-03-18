document.addEventListener("DOMContentLoaded", function () {
  getDependencies();
});

var url;
var envId;
var processes = [];
function getDependencies() {
  chrome.runtime.sendMessage(
    {
      action: "GET_PROCESS_DEPENDENCIES",
    },
    function (response) {
      console.log(response);
      var fieldName = response.fieldName;

      document.getElementById("field-name").innerHTML = fieldName;

      processes = response.processes;
      url = response.url;
      envId = response.envId;

      renderDependencies(processes);
    }
  );
}

var checkboxActive = document.querySelector("input[name=activeOnly]");
checkboxActive.addEventListener("change", function () {
  filter();
});

var checkboxBR = document.querySelector("input[name=brOnly]");
checkboxBR.addEventListener("change", function () {
  filter();
});
var checkboxFlow = document.querySelector("input[name=flowOnly]");
checkboxFlow.addEventListener("change", function () {
  filter();
});

var search = document.querySelector("input[name=filter]");
search.addEventListener("input", function () {
  filter();
});

function filter() {
  var onlyActive = checkboxActive.checked;
  var onlyBR = checkboxBR.checked;
  var onlyFlow = checkboxFlow.checked;

  var searchFilter = search.value.toLowerCase();

  var filtered = processes.filter(
    (p) =>
      (!onlyActive || p.status == "Activated") &&
      (!onlyFlow || p.category == "Modern Flow") &&
      (!onlyBR || p.category == "Business Rule") &&
      p.name.toLowerCase().includes(searchFilter)
  );

  renderDependencies(filtered);
}

function renderDependencies(processes) {
  var content = "";

  var brLink = `${url}/sfa/workflow/edit.aspx?id=`;
  var flowLink = `https://make.powerautomate.com/environments/${envId}/flows/`;

  var table = `
  <div class="table-container">
    <div class="table-wrapper">
      <table id="main">                        
          <thead>
            <tr>
            <th></th>
            <th>Name</th>
            <th>Category</th>
            <th>Status</th>
            </tr>
          </thead>
          <tbody>
          ${processes
            .map(
              (e) =>
                `<tr>
                    <td style="width:10px">${processes.indexOf(e) + 1}</td>
                    <td>
                        <a target="_blank" href=${
                          e.category == "Business Rule" ? `${brLink}${e.id}&newWindow=true` : `${flowLink}${e.id}?v3=false`
                        }>${e.name}</a>
                    </td>
                    <td id="category" style="color:${e.category == "Business Rule" ? "#8871cf" : "#72bdfd"}">${e.category}</td>
                    <td>${e.status}</td>
                </tr>`
            )
            .join("")}
          </tbody>
      </table>
    </div>
  </div>`;

  content += table;

  document.getElementById("dependency-content").innerHTML = content;
}
