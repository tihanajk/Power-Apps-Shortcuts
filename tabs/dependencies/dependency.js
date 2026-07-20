document.addEventListener("DOMContentLoaded", function () {
  initialize();
  getDependencies();
});

var url;
var envId;
var processes = [];

var currentRows = [];
var sortState = { key: null, dir: 1 };

const CATEGORIES = {
  PLUGIN: -1,
  EV: -2,
  WF: 0,
  BR: 2,
  ACTION: 3,
  BPF: 4,
  FLOW: 5,
};

var checkboxActive;
var checkboxBR;
var checkboxFlow;
var checkboxBPF;
var checkboxWF;
var checkboxPL;
var checkboxAction;
var checkboxEV;

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

  checkboxAction = document.querySelector("input[name=action]");
  checkboxAction.addEventListener("change", function () {
    filter();
  });

  checkboxEV = document.querySelector("input[name=ev]");
  checkboxEV.addEventListener("change", function () {
    filter();
  });

  search = document.querySelector("input[name=filter]");
  search.addEventListener("input", function () {
    filter();
  });

  document.getElementById("downloadBtn").addEventListener("click", () => downloadData());
}

function downloadData() {
  var table = document.getElementById("main");

  var field = document.getElementById("field-name").innerHTML;

  const workbook = XLSX.utils.table_to_book(table, { sheet: field });
  XLSX.writeFile(workbook, `dependencies.xlsx`);
}

function getDependencies() {
  chrome.runtime.sendMessage(
    {
      action: "GET_PROCESS_DEPENDENCIES",
    },
    function (response) {
      var fieldName = response.fieldName;

      if (fieldName) document.getElementById("field-name").innerHTML = fieldName;

      url = response.url;
      envId = response.envId;

      if (response?.processes) {
        processes = response.processes;
        updateToggleAvailability();
        renderDependencies(processes);
      } else {
        showLoading();
        setTimeout(() => {
          getDependencies();
        }, "1000");
      }
    },
  );
}

function showLoading() {
  var content = document.getElementById("dependency-content");
  if (content.querySelector("#loading")) return;
  content.innerHTML = `<div id="loading" class="loading">
      <span class="spinner"></span>
      <span>Loading dependencies...</span>
    </div>`;
}

// Only the process types picked in the popup are returned, so disable the
// toggles for categories that aren't present in the results.
function updateToggleAvailability() {
  var map = [
    { cb: checkboxBR, cat: CATEGORIES.BR },
    { cb: checkboxFlow, cat: CATEGORIES.FLOW },
    { cb: checkboxBPF, cat: CATEGORIES.BPF },
    { cb: checkboxWF, cat: CATEGORIES.WF },
    { cb: checkboxAction, cat: CATEGORIES.ACTION },
    { cb: checkboxPL, cat: CATEGORIES.PLUGIN },
    { cb: checkboxEV, cat: CATEGORIES.EV },
  ];

  var present = {};
  processes.forEach(function (p) {
    present[p.category] = true;
  });

  map.forEach(function (m) {
    var available = !!present[m.cat];
    m.cb.disabled = !available;
    var label = m.cb.closest(".toggle");
    if (label) label.classList.toggle("toggle-disabled", !available);
  });
}

function filter() {
  var onlyActive = checkboxActive.checked;
  var checkedBR = checkboxBR.checked;
  var checkedFlow = checkboxFlow.checked;
  var checkedBPF = checkboxBPF.checked;
  var checkedWF = checkboxWF.checked;
  var checkedPL = checkboxPL.checked;
  var checkedAction = checkboxAction.checked;
  var checkedEV = checkboxEV.checked;

  var searchFilter = search.value.toLowerCase();

  var filtered = processes.filter(
    (p) =>
      (!onlyActive || (p.category == CATEGORIES.PLUGIN && p.status == 0) || p.status == 1) &&
      p.name.toLowerCase().includes(searchFilter) &&
      ((checkedBPF && p.category == CATEGORIES.BPF) ||
        (checkedFlow && p.category == CATEGORIES.FLOW) ||
        (checkedBR && p.category == CATEGORIES.BR) ||
        (checkedWF && p.category == CATEGORIES.WF) ||
        (checkedPL && p.category == CATEGORIES.PLUGIN) ||
        (checkedEV && p.category == CATEGORIES.EV) ||
        (checkedAction && p.category == CATEGORIES.ACTION)),
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
    case CATEGORIES.ACTION:
      return `${wfLink}${id}`;
    case CATEGORIES.BPF:
      return `${bpfLink}${id}`;
    case CATEGORIES.EV:
      return `${url}/main.aspx?pagetype=entityrecord&etn=environmentvariabledefinition&id=${id}`;
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
    case CATEGORIES.ACTION:
      return "#ff6347";
    case CATEGORIES.BPF:
      return "#406fda";
    case CATEGORIES.PLUGIN:
      return "#15ae19";
    case CATEGORIES.EV:
      return "#e6a817";
    default:
      return "";
  }
}

function renderDependencies(processes) {
  var content = "";

  currentRows = processes.slice();
  sortRows(currentRows);

  function arrow(key) {
    if (sortState.key !== key) return "";
    return ` <span class="sort-arrow">${sortState.dir === 1 ? "▲" : "▼"}</span>`;
  }

  var table = `
  <div class="table-container">
    <div class="table-wrapper">
      <table id="main">                        
          <thead>
            <tr>
            <th></th>
            <th class="sortable" data-sort="name">Name${arrow("name")}</th>
            <th class="sortable" data-sort="category_display">Category${arrow("category_display")}</th>
            <th class="sortable" data-sort="primary_entity">Primary entity${arrow("primary_entity")}</th>
            <th class="sortable" data-sort="status_display">Status${arrow("status_display")}</th>
            </tr>
          </thead>
          <tbody>
          ${currentRows
            .map(
              (e) =>
                `<tr>
                    <td>${currentRows.indexOf(e) + 1}</td>
                    <td>
                    ${
                      e.category == CATEGORIES.PLUGIN
                        ? `<div style="color:blue">${e.name} ${e.pl_image ? "🖼️" : "⚡"}</div>`
                        : `<a target='_blank' href=${handleLink(e.category, e.id)}>${e.name}</a>`
                    }
                    </td>
                    <td id="category" style="color:${handleColor(e.category)}">${e.category_display}</td>
                    <td id="primary-entity" style="color:#5d699a">${e.primary_entity != "none" ? e.primary_entity : ""}</td>
                    <td style="color:${e.status == 1 ? "" : "grey"}">
                    ${e.status == 1 ? "🟢" : "🟡"} ${e.status_display}
                    </td>
                </tr>`,
            )
            .join("")}
          </tbody>
      </table>
    </div>
  </div>`;

  content += table;

  document.getElementById("dependency-content").innerHTML = content;

  document.querySelectorAll("th.sortable").forEach(function (th) {
    th.addEventListener("click", function () {
      var key = th.getAttribute("data-sort");
      if (sortState.key === key) {
        sortState.dir = -sortState.dir;
      } else {
        sortState.key = key;
        sortState.dir = 1;
      }
      renderDependencies(currentRows);
    });
  });

  makeColumnsResizable();
}

function makeColumnsResizable() {
  var table = document.getElementById("main");
  if (!table) return;

  var headers = table.querySelectorAll("thead th");
  headers.forEach(function (th) {
    var handle = document.createElement("span");
    handle.className = "col-resizer";
    th.appendChild(handle);

    var startX, startWidth;

    handle.addEventListener("mousedown", function (e) {
      startX = e.pageX;
      startWidth = th.offsetWidth;
      handle.classList.add("resizing");
      e.preventDefault();
      e.stopPropagation();

      function onMouseMove(ev) {
        var newWidth = startWidth + (ev.pageX - startX);
        if (newWidth < 40) newWidth = 40;
        th.style.width = newWidth + "px";
      }

      function onMouseUp() {
        handle.classList.remove("resizing");
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    // Prevent sort toggle when clicking the resizer
    handle.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  });
}

function sortRows(rows) {
  if (!sortState.key) return;

  rows.sort(function (a, b) {
    var av = a[sortState.key];
    var bv = b[sortState.key];

    if (sortState.key === "primary_entity") {
      av = av === "none" ? "" : av;
      bv = bv === "none" ? "" : bv;
    }

    av = (av ?? "").toString().toLowerCase();
    bv = (bv ?? "").toString().toLowerCase();

    if (av < bv) return -1 * sortState.dir;
    if (av > bv) return 1 * sortState.dir;
    return 0;
  });
}
