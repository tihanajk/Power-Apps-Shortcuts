var search;
var allTabs = [];

document.addEventListener("DOMContentLoaded", function () {
  getFormLayoutResults();
  search = document.querySelector("input[name=filter]");
  search.addEventListener("input", function () {
    filterData();
  });

  document.getElementById("downloadBtn").addEventListener("click", () => downloadData());
});

function downloadData() {
  var rows = [];
  allTabs.forEach(function (tab) {
    tab.sections.forEach(function (section) {
      if (section.controls.length === 0) {
        rows.push({
          "Tab Label": tab.label,
          "Tab Name": tab.name,
          "Tab Visible": tab.visible,
          "Section Label": section.label,
          "Section Name": section.name,
          "Section Visible": section.visible,
          "Control Name": "",
          Attribute: "",
          "Control Type": "",
          Visible: "",
          Disabled: "",
        });
      }
      section.controls.forEach(function (control) {
        rows.push({
          "Tab Label": tab.label,
          "Tab Name": tab.name,
          "Tab Visible": tab.visible,
          "Section Label": section.label,
          "Section Name": section.name,
          "Section Visible": section.visible,
          "Control Name": control.name,
          Attribute: control.attribute || "",
          "Control Type": control.type,
          Visible: control.visible,
          Disabled: control.disabled,
        });
      });
    });
  });

  var ws = XLSX.utils.json_to_sheet(rows);
  var workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, "Form Layout");
  XLSX.writeFile(workbook, "form_layout.xlsx");
}

function getFormLayoutResults() {
  chrome.runtime.sendMessage(
    {
      action: "GET_FORM_LAYOUT",
    },
    function (response) {
      var data = response.data;
      document.getElementById("form-name").innerHTML = data.entityName + " - " + data.formName;
      allTabs = data.tabs;
      renderLayout(allTabs);
    },
  );
}

function filterData() {
  var term = search.value.toLowerCase();
  if (!term) {
    renderLayout(allTabs);
    return;
  }

  var filtered = [];
  allTabs.forEach(function (tab) {
    var tabMatch = tab.label.toLowerCase().includes(term) || tab.name.toLowerCase().includes(term);

    var filteredSections = [];
    tab.sections.forEach(function (section) {
      var sectionMatch = (section.label || "").toLowerCase().includes(term) || section.name.toLowerCase().includes(term);

      var filteredControls = section.controls.filter(function (c) {
        return c.name.toLowerCase().includes(term) || (c.attribute || "").toLowerCase().includes(term) || c.type.toLowerCase().includes(term);
      });

      if (tabMatch || sectionMatch || filteredControls.length > 0) {
        filteredSections.push({
          label: section.label,
          name: section.name,
          visible: section.visible,
          controls: sectionMatch || tabMatch ? section.controls : filteredControls,
        });
      }
    });

    if (tabMatch || filteredSections.length > 0) {
      filtered.push({
        label: tab.label,
        name: tab.name,
        visible: tab.visible,
        sections: tabMatch && filteredSections.length === 0 ? tab.sections : filteredSections,
      });
    }
  });

  renderLayout(filtered);
}

function renderLayout(tabs) {
  var totalControls = 0;
  tabs.forEach(function (t) {
    t.sections.forEach(function (s) {
      totalControls += s.controls.length;
    });
  });

  var html = `<div class="summary">Tabs: ${tabs.length} | Controls: ${totalControls}</div>`;

  tabs.forEach(function (tab) {
    html += `<div class="tab-block">
      <div class="tab-header">
        <span class="tab-label">${tab.label}</span>
        <span class="tab-name">${tab.name}</span>
        ${!tab.visible ? '<span class="hidden-badge">hidden</span>' : ""}
      </div>`;

    tab.sections.forEach(function (section) {
      html += `<div class="section-block">
        <div class="section-header">
          <span class="section-label">${section.label || "(no label)"}</span>
          <span class="section-name">${section.name}</span>
          ${!section.visible ? '<span class="hidden-badge">hidden</span>' : ""}
        </div>`;

      if (section.controls.length > 0) {
        html += `<div class="table-container"><div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Control Name</th>
                <th>Attribute</th>
                <th>Type</th>
                <th>Visible</th>
                <th>Disabled</th>
              </tr>
            </thead>
            <tbody>`;

        section.controls.forEach(function (c) {
          html += `<tr>
            <td>${c.name}</td>
            <td>${c.attribute || ""}</td>
            <td>${c.type}</td>
            <td>${c.visible ? "✅" : "❌"}</td>
            <td>${c.disabled === null ? "-" : c.disabled ? "🔒" : "✏️"}</td>
          </tr>`;
        });

        html += `</tbody></table></div></div>`;
      } else {
        html += `<div class="no-controls">No controls</div>`;
      }

      html += `</div>`;
    });

    html += `</div>`;
  });

  document.getElementById("layout-content").innerHTML = html;
}
