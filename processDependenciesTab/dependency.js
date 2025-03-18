document.addEventListener("DOMContentLoaded", function () {
  getDependencies();
});

function getDependencies() {
  chrome.runtime.sendMessage(
    {
      action: "GET_PROCESS_DEPENDENCIES",
    },
    function (response) {
      console.log(response);
      var processes = response.processes;
      var fieldName = response.fieldName;
      var content = renderDependencies(processes, fieldName, response.url, response.envId);

      document.getElementById("dependency-content").innerHTML = content;
    }
  );
}

function renderDependencies(processes, fieldName, url, envId) {
  var content = "";

  content += `<h1>${fieldName}</h1>`;

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
                    <td>${processes.indexOf(e) + 1}</td>
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

  return content;
}
