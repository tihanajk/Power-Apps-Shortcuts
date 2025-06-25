document.addEventListener("DOMContentLoaded", function () {
  getDependencies();
});

var url;
var envId;
var processes = [];

const CATEGORIES = {
  FLOW: 5,
  BPF: 4,
  BR: 2,
  WF: 0,
};

var checkboxActive;
var checkboxBR;
var checkboxFlow;
var checkboxBPF;
var checkboxWF;

var search;

function getDependencies() {
  checkboxActive = document.querySelector("input[name=activeOnly]");
  checkboxActive.addEventListener("change", function () {
    filter();
  });

  checkboxBR = document.querySelector("input[name=br]");
  checkboxBR.addEventListener("change", function () {
    filter();
  });

  checkboxFlow = document.querySelector("input[name=flow]");
  checkboxFlow.addEventListener("change", function () {
    filter();
  });

  checkboxBPF = document.querySelector("input[name=bpf]");
  checkboxBPF.addEventListener("change", function () {
    filter();
  });

  checkboxWF = document.querySelector("input[name=wf]");
  checkboxWF.addEventListener("change", function () {
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

      processes = response?.processes;
      url = response.url;
      envId = response.envId;

      var openTab = response.openTab;
      if (!openTab) {
        renderDependencies(processes);
      }
    }
  );
}

function filter() {
  var onlyActive = checkboxActive.checked;
  var checkedBR = checkboxBR.checked;
  var checkedFlow = checkboxFlow.checked;
  var checkedBPF = checkboxBPF.checked;
  var checkedWF = checkboxWF.checked;

  var searchFilter = search.value.toLowerCase();

  var filtered = processes.filter(
    (p) =>
      (!onlyActive || p.status == 1) &&
      p.name.toLowerCase().includes(searchFilter) &&
      ((checkedBPF && p.category == CATEGORIES.BPF) ||
        (checkedFlow && p.category == CATEGORIES.FLOW) ||
        (checkedBR && p.category == CATEGORIES.BR) ||
        (checkedWF && p.category == CATEGORIES.WF))
  );

  renderDependencies(filtered);
}

function handleLink(category, id) {
  var brLink = `${url}/sfa/workflow/edit.aspx?id=`;
  var flowLink = `https://make.powerautomate.com/environments/${envId}/flows/`;
  var bpfLink = `${url}/Tools/ProcessControl/UnifiedProcessDesigner.aspx?id=`;
  var wfLink = `${url}/sfa/workflow/edit.aspx?id=`;

  switch (category) {
    case CATEGORIES.BR:
      return `${brLink}${id}&newWindow=true`;
    case CATEGORIES.FLOW:
      return `${flowLink}${id}?v3=false`;
    case CATEGORIES.WF:
      return `${wfLink}${id}`;
    case CATEGORIES.BPF:
      return `${bpfLink}${id}`;
    default:
      return "";
  }
}

function handleColor(category) {
  switch (category) {
    case CATEGORIES.BR:
      return "#8871cf";
    case CATEGORIES.FLOW:
      return "#72bdfd";
    case CATEGORIES.WF:
      return "#dc6edc";
    case CATEGORIES.BPF:
      return "#406fda";
    default:
      return "";
  }
}

function renderDependencies(processes) {
  var content = "";

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
                        <a target="_blank" href=${handleLink(e.category, e.id)}>${e.name}</a>
                    </td>
                    <td id="category" style="color:${handleColor(e.category)}">${e.category_display}</td>
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
