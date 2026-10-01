var allFields = [];
var search;
var checkboxForm;
var orgUrl = "";
var entityMetadataId = null;
var solutionId = null;

document.addEventListener("DOMContentLoaded", function () {
  getFieldsResults();

  search = document.querySelector("input[name=filter]");
  search.addEventListener("input", function () {
    filterFields();
  });

  checkboxForm = document.querySelector("input[name=formOnly]");
  checkboxForm.addEventListener("change", function () {
    filterFields();
  });

  document.getElementById("downloadBtn").addEventListener("click", () => downloadData());

  document.addEventListener("click", function (e) {
    var el = e.target.closest(".formula-link");
    if (!el) return;
    if (el.dataset.behavior === "3") {
      showFormulaModal(el.dataset.formula, el.dataset.field);
      return;
    }
    var editorUrl = buildCalcFieldUrl(el.dataset.metadataid, el.dataset.behavior);
    if (editorUrl) window.open(editorUrl, "_blank");
  });
});

function downloadData() {
  var table = document.getElementById("main");

  var sheetName = document.getElementById("entity-name").innerHTML;

  const workbook = XLSX.utils.table_to_book(table, { sheet: sheetName });
  XLSX.writeFile(workbook, `allfields.xlsx`);
}

function getFieldsResults() {
  chrome.runtime.sendMessage(
    {
      action: "GET_ALL_FIELDS",
    },
    function (response) {
      document.getElementById("entity-name").innerHTML = response.entityName.toUpperCase();

      orgUrl = response.url || "";
      entityMetadataId = response.entityMetadataId || null;
      solutionId = response.solutionId || null;

      allFields = response.fields;
      renderResults(allFields);
    },
  );
}

function filterFields() {
  var searchFilter = search.value.toLowerCase();
  var formOnly = checkboxForm.checked;

  var filtered = allFields.filter(
    (f) =>
      (!formOnly || (formOnly && f.onForm)) &&
      (f.name.toLowerCase().includes(searchFilter) || (f.value && f.value.toString().toLowerCase().includes(searchFilter))),
  );

  renderResults(filtered);
}

function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Builds the native (classic) calculated/rollup field editor URL; returns null if ids are missing.
function buildCalcFieldUrl(metadataId, behavior) {
  if (!orgUrl || !metadataId || !entityMetadataId || !solutionId) return null;
  var braced = (g) => "%7B" + String(g).replace(/[{}]/g, "") + "%7D";
  var path =
    String(behavior) === "2"
      ? "/tools/systemcustomization/RollupFields/manageRollupFields.aspx"
      : "/tools/systemcustomization/calculatedfields/manageCalculatedFields.aspx";
  return (
    `${orgUrl}${path}` +
    `?BRlaunchpoint=AttributeEditor&appSolutionId=${braced(solutionId)}` +
    `&attributeId=${braced(metadataId)}&entityId=${braced(entityMetadataId)}`
  );
}

// Shows a formula read-only using the shared paModal (same look as the fetchXML/open-record prompts).
function showFormulaModal(formula, fieldName) {
  paModal.prompt("", formula || "(no formula found)", {
    title: fieldName ? `Formula — ${fieldName}` : "Formula",
    multiline: true,
    rows: 12,
    copyBtn: true,
    readonly: true,
  });
}

function renderResults(data) {
  var content = `<div class="count">count: ${data.length}</div>`;

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
          ${data
            .map(
              (d) =>
                `<tr><td>${d.name}${d.onForm ? ` <span class="field-symbol" title="On form">🟢</span>` : ""}${
                  d.isAltKey ? ` <span class="field-symbol" title="Alternate key">🔑</span>` : ""
                }${
                  d?.behavior == 1
                    ? ` <span class="field-symbol formula-link" data-metadataid="${escapeAttr(
                        d.metadataId || "",
                      )}" data-behavior="1" title="Calculated — click to open the formula editor" style="cursor:pointer">©️</span>`
                    : d?.behavior == 2
                      ? ` <span class="field-symbol formula-link" data-metadataid="${escapeAttr(
                          d.metadataId || "",
                        )}" data-behavior="2" title="Rollup — click to open the formula editor" style="cursor:pointer">®️</span>`
                      : d?.behavior == 3
                        ? ` <span class="field-symbol formula-link" data-field="${escapeAttr(d.name)}" data-behavior="3" data-formula="${escapeAttr(
                            d.formula || "",
                          )}" title="Power Fx formula — click to view" style="cursor:pointer">🌀</span>`
                        : ""
                }</td><td>${d.value == null ? "" : d.value}</td></tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>`;

  content += table;

  document.getElementById("fields-content").innerHTML = content;
}
