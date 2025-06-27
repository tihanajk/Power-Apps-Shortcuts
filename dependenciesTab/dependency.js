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
  PLUGIN: -1,
};

var checkboxActive;
var checkboxBR;
var checkboxFlow;
var checkboxBPF;
var checkboxWF;
var checkboxPL;

var search;

function initialize() {
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

  checkboxPL = document.querySelector("input[name=pl]");
  checkboxPL.addEventListener("change", function () {
    filter();
  });

  search = document.querySelector("input[name=filter]");
  search.addEventListener("input", function () {
    filter();
  });
}

function getDependencies() {
  initialize();

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

      if (processes) renderDependencies(processes);
      else getDependencies();
    }
  );
}

function filter() {
  var onlyActive = checkboxActive.checked;
  var checkedBR = checkboxBR.checked;
  var checkedFlow = checkboxFlow.checked;
  var checkedBPF = checkboxBPF.checked;
  var checkedWF = checkboxWF.checked;
  var checkedPL = checkboxPL.checked;

  var searchFilter = search.value.toLowerCase();

  var filtered = processes.filter(
    (p) =>
      (!onlyActive || (p.category == CATEGORIES.PLUGIN && p.status == 0) || p.status == 1) &&
      p.name.toLowerCase().includes(searchFilter) &&
      ((checkedBPF && p.category == CATEGORIES.BPF) ||
        (checkedFlow && p.category == CATEGORIES.FLOW) ||
        (checkedBR && p.category == CATEGORIES.BR) ||
        (checkedWF && p.category == CATEGORIES.WF) ||
        (checkedPL && p.category == CATEGORIES.PLUGIN))
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
      return "#";
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
    case CATEGORIES.PLUGIN:
      return "#15ae19";
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
                    ${
                      e.category == CATEGORIES.PLUGIN
                        ? `<div style="color:blue">${e.name}</div>`
                        : `<a target='_blank' href=${handleLink(e.category, e.id)}>${e.name}</a>`
                    }
                    </td>
                    <td id="category" style="color:${handleColor(e.category)}">${e.category_display}</td>
                    <td style="color:${e.status == 1 ? "" : "grey"}">
                    ${e.status == 1 ? "🟢" : "🟡"} ${e.status_display}
                    </td>
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
