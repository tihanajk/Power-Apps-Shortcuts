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

function normalizeRequired(value) {
  if (value == null || value === "") return null;
  var str = String(value).toLowerCase();
  if (str === "optional" || str === "none" || str === "0") return "none";
  if (str.indexOf("recommend") !== -1 || str === "3") return "recommended";
  if (str.indexOf("require") !== -1 || str === "1" || str === "2") return "required";
  return str;
}

function renderStateComparison(defaultHtml, currentHtml) {
  return `<div class="state-compare">
    <div class="state-row"><span class="state-label">Default:</span> ${defaultHtml}</div>
    <div class="state-row"><span class="state-label">Current:</span> ${currentHtml}</div>
  </div>`;
}

function renderVisibleState(defaultValue, currentValue) {
  var defaultHtml = defaultValue ? '<span title="Visible">✅</span> Visible' : '<span title="Hidden">❌</span> Hidden';
  var currentHtml = currentValue ? '<span title="Visible">✅</span> Visible' : '<span title="Hidden">❌</span> Hidden';
  return renderStateComparison(defaultHtml, currentHtml);
}

function renderDisabledState(defaultValue, currentValue) {
  if (currentValue == null) {
    return renderStateComparison("-", "-");
  }
  var defaultHtml = defaultValue ? '<span title="Disabled">🔒</span> Disabled' : '<span title="Editable">✏️</span> Editable';
  var currentHtml = currentValue ? '<span title="Disabled">🔒</span> Disabled' : '<span title="Editable">✏️</span> Editable';
  return renderStateComparison(defaultHtml, currentHtml);
}

function renderRequiredState(defaultValue, currentValue) {
  var reqToHtml = function (value) {
    if (value === "required") return '<span title="Required">🔴</span> Required';
    if (value === "recommended") return '<span title="Recommended">🔵</span> Recommended';
    if (value === "none") return "Optional";
    return "-";
  };
  return renderStateComparison(reqToHtml(defaultValue), reqToHtml(currentValue));
}

function downloadData() {
  var rows = [];
  allTabs.forEach(function (tab) {
    tab.sections.forEach(function (section) {
      if (section.controls.length === 0) {
        rows.push({
          "Tab Label": tab.label,
          "Tab Name": tab.name,
          "Tab Visible Default": tab.defaultVisible,
          "Tab Visible Current": tab.visible,
          "Tab Visibility Changed": tab.visibleChanged,
          "Section Label": section.label,
          "Section Name": section.name,
          "Section Visible Default": section.defaultVisible,
          "Section Visible Current": section.visible,
          "Section Visibility Changed": section.visibleChanged,
          "Control Name": "",
          Attribute: "",
          "Control Type": "",
          "Visible Default": "",
          "Visible Current": "",
          "Visible Changed": "",
          "Disabled Default": "",
          "Disabled Current": "",
          "Disabled Changed": "",
          "Required Default": "",
          "Required Current": "",
          "Required Changed": "",
          "State Differs From Default": "",
        });
      }
      section.controls.forEach(function (control) {
        rows.push({
          "Tab Label": tab.label,
          "Tab Name": tab.name,
          "Tab Visible Default": tab.defaultVisible,
          "Tab Visible Current": tab.visible,
          "Tab Visibility Changed": tab.visibleChanged,
          "Section Label": section.label,
          "Section Name": section.name,
          "Section Visible Default": section.defaultVisible,
          "Section Visible Current": section.visible,
          "Section Visibility Changed": section.visibleChanged,
          "Control Name": control.name,
          Attribute: control.attribute || "",
          "Control Type": control.type,
          "Visible Default": control.defaultVisible,
          "Visible Current": control.visible,
          "Visible Changed": control.visibleChanged,
          "Disabled Default": control.defaultDisabled,
          "Disabled Current": control.disabled,
          "Disabled Changed": control.disabledChanged,
          "Required Default": control.defaultRequired || "",
          "Required Current": control.required || "",
          "Required Changed": control.requiredChanged,
          "State Differs From Default": control.automationChanged,
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
      renderRecordHeader(document.getElementById("form-name"), {
        primaryName: data.primaryName,
        entityName: data.entityName,
        recordId: data.entityId,
        extra: data.formName,
        extraLabel: "form",
      });
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
          ...section,
          controls: sectionMatch || tabMatch ? section.controls : filteredControls,
        });
      }
    });

    if (tabMatch || filteredSections.length > 0) {
      filtered.push({
        ...tab,
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

  var html = `<div class="summary">Tabs: ${tabs.length} | Controls: ${totalControls}</div>
    <div class="legend">
      <span class="legend-title">Legend:</span>
      <span class="legend-item">✅ Visible</span>
      <span class="legend-item">❌ Hidden</span>
      <span class="legend-item">🔒 Disabled</span>
      <span class="legend-item">✏️ Editable</span>
      <span class="legend-item">🔴 Required</span>
      <span class="legend-item">🔵 Recommended</span>
      <span class="legend-item">- Not applicable</span>
    </div>`;

  tabs.forEach(function (tab) {
    var tabDefaultVisible = typeof tab.defaultVisible === "boolean" ? tab.defaultVisible : tab.visible;
    html += `<div class="tab-block">
      <div class="tab-header">
        <span class="tab-label">${tab.label}</span>
        <span class="tab-name">${tab.name}</span>
        <span class="state-inline">Visible: ${tabDefaultVisible ? "default ✅" : "default ❌"} → ${tab.visible ? "current ✅" : "current ❌"}</span>
        ${!tab.visible ? '<span class="hidden-badge">hidden</span>' : ""}
      </div>`;

    tab.sections.forEach(function (section) {
      var sectionDefaultVisible = typeof section.defaultVisible === "boolean" ? section.defaultVisible : section.visible;
      html += `<div class="section-block">
        <div class="section-header">
          <span class="section-label">${section.label || "(no label)"}</span>
          <span class="section-name">${section.name}</span>
          <span class="state-inline">Visible: ${sectionDefaultVisible ? "default ✅" : "default ❌"} → ${section.visible ? "current ✅" : "current ❌"}</span>
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
                <th>Required</th>
              </tr>
            </thead>
            <tbody>`;

        section.controls.forEach(function (c) {
          var defaultVisible = typeof c.defaultVisible === "boolean" ? c.defaultVisible : c.visible;
          var defaultDisabled = c.defaultDisabled;
          if (defaultDisabled == null) defaultDisabled = c.disabled;

          var currentRequired = normalizeRequired(c.required);
          var defaultRequired = normalizeRequired(c.defaultRequired);
          if (defaultRequired == null) defaultRequired = currentRequired;

          html += `<tr>
            <td>${c.name}</td>
            <td>${c.attribute || ""}</td>
            <td><span class="ctrl-type">${c.type}</span></td>
            <td>${renderVisibleState(defaultVisible, c.visible)}</td>
            <td>${renderDisabledState(defaultDisabled, c.disabled)}</td>
            <td>${renderRequiredState(defaultRequired, currentRequired)}</td>
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
