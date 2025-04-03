document.addEventListener("DOMContentLoaded", function () {
  getDependencies();
});

var url;
var envId;
var processes = [];

var FLOW = 5;
var BPF = 4;
var BR = 2;

var checkboxActive;
var checkboxBR;
var checkboxFlow;
var checkboxBPF;
var search;

function getDependencies() {
  checkboxActive = document.querySelector("input[name=activeOnly]");
  checkboxActive.addEventListener("change", function () {
    filter();
  });

  checkboxBR = document.querySelector("input[name=brOnly]");
  checkboxBR.addEventListener("change", function () {
    filter();
  });

  checkboxFlow = document.querySelector("input[name=flowOnly]");
  checkboxFlow.addEventListener("change", function () {
    filter();
  });

  checkboxBPF = document.querySelector("input[name=bpfOnly]");
  checkboxBPF.addEventListener("change", function () {
    filter();
  });

  search = document.querySelector("input[name=filter]");
  search.addEventListener("input", function () {
    filter();
  });

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

function filter() {
  var onlyActive = checkboxActive.checked;
  var onlyBR = checkboxBR.checked;
  var onlyFlow = checkboxFlow.checked;
  var onlyBPF = checkboxBPF.checked;

  var searchFilter = search.value.toLowerCase();

  var filtered = processes.filter(
    (p) =>
      (!onlyActive || p.status == 1) &&
      (!onlyFlow || p.category == FLOW) &&
      (!onlyBR || p.category == BR) &&
      (!onlyBPF || p.category == BPF) &&
      p.name.toLowerCase().includes(searchFilter)
  );

  renderDependencies(filtered);
}

function renderDependencies(processes) {
  var content = "";

  var brLink = `${url}/sfa/workflow/edit.aspx?id=`;
  var flowLink = `https://make.powerautomate.com/environments/${envId}/flows/`;
  var bpfLink = `${url}/Tools/ProcessControl/UnifiedProcessDesigner.aspx?id=`;

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
                          e.category == BR
                            ? `${brLink}${e.id}&newWindow=true`
                            : e.category == FLOW
                            ? `${flowLink}${e.id}?v3=false`
                            : `${bpfLink}${e.id}`
                        }>${e.name}</a>
                    </td>
                    <td id="category" style="color:${e.category == BR ? "#8871cf" : e.category == FLOW ? "#72bdfd" : "#10368c"}">${
                  e.category_display
                }</td>
                    <td style="color:${e.status == 1 ? "" : "grey"}">${e.status_display}</td>
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
