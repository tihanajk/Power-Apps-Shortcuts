document.addEventListener("DOMContentLoaded", function () {
  getVariables();

  search = document.querySelector("input[name=filter]");
  search.addEventListener("input", function () {
    filterResults();
  });

  document.getElementById("downloadBtn").addEventListener("click", () => downloadData());
  document.getElementById("createBtn").addEventListener("click", () => openCreateModal());

  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("edit-btn")) {
      var id = e.target.dataset.id;
      var variable = allVariables.find((v) => v.id === id);
      if (variable) openEditModal(variable);
    }
    if (e.target.id === "modal-cancel" || e.target.id === "create-cancel") {
      closeModal();
    }
    if (e.target.id === "modal-save") {
      saveVariable();
    }
    if (e.target.id === "create-save") {
      createVariable();
    }
  });
});

function downloadData() {
  var table = document.getElementById("main");

  const workbook = XLSX.utils.table_to_book(table, { sheet: "variables" });
  XLSX.writeFile(workbook, "environment_variables.xlsx");
}

var search;
var allVariables = [];

function getVariables() {
  chrome.runtime.sendMessage(
    {
      action: "GET_ENVIRONMENT_VARIABLES",
    },
    function (response) {
      allVariables = response.data.variables;
      renderResults(response.data);
    },
  );
}

function filterResults() {
  var searchFilter = search.value.toLowerCase();
  var filtered = allVariables.filter(
    (v) =>
      v.name.toLowerCase().includes(searchFilter) ||
      (v.displayName != null && v.displayName.toLowerCase().includes(searchFilter)) ||
      (v.value != null && v.value.toString().toLowerCase().includes(searchFilter)) ||
      (v.defaultValue != null && v.defaultValue.toString().toLowerCase().includes(searchFilter)),
  );
  renderResults({ variables: filtered });
}

function renderResults(data) {
  var variables = data.variables;

  var content = `<div class="count">count: ${variables.length}</div>`;
  content += `<div class="table-container">
                <table id="main">
                    <thead>
                        <tr>
                            <th>Display Name</th>
                            <th>Schema Name</th>
                            <th>Default Value</th>
                            <th>Value</th>
                           <th></th>
                        </tr>
                    </thead>
                <tbody>`;

  variables.forEach((d) => {
    var defaultVal = d.defaultValue != null ? d.defaultValue : "";
    var val = d.value != null ? d.value : "<span style='color:#9ca3af;font-style:italic'>-</span>";
    var displayName = d.displayName != null ? d.displayName : "";
    content += `<tr>
        <td>${displayName}</td>
        <td>
        <a href="${d.link}" target="_blank">${d.name}</a>
        </td>
        <td>${defaultVal}</td>
        <td>${val}</td>
        <td><button class="edit-btn" data-id="${d.id}">Edit</button></td>
    </tr>`;
  });

  content += `</tbody></table></div>`;

  document.getElementById("variables-content").innerHTML = content;
}

function openEditModal(variable) {
  var currentVal = variable.value != null ? variable.value : "";
  var defaultVal = variable.defaultValue != null ? variable.defaultValue : "";

  var modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.id = "edit-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <h2 class="modal-title">${variable.displayName || variable.name}</h2>
      <div class="modal-field">
        <label class="modal-label" for="modal-default-input">Default Value</label>
        <textarea id="modal-default-input" class="modal-input" rows="3">${defaultVal}</textarea>
      </div>
      <div class="modal-field">
        <label class="modal-label" for="modal-value-input">Current Value</label>
        <textarea id="modal-value-input" class="modal-input" rows="3">${currentVal}</textarea>
      </div>
      <div class="modal-actions">
        <button id="modal-cancel" class="modal-btn modal-btn-cancel">Cancel</button>
        <button id="modal-save" class="modal-btn modal-btn-save" data-id="${variable.id}" data-valueid="${variable.valueId || ""}">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.getElementById("modal-default-input").focus();
}

function closeModal() {
  document.querySelectorAll(".modal-overlay").forEach((m) => m.remove());
}

function openCreateModal() {
  var modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.id = "create-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <h2 class="modal-title">New environment variable</h2>
      <div class="modal-field">
        <label class="modal-label" for="create-display-input">Display Name</label>
        <input id="create-display-input" class="modal-input" type="text" />
      </div>
      <div class="modal-field">
        <label class="modal-label" for="create-schema-input">Schema Name</label>
        <input id="create-schema-input" class="modal-input" type="text" placeholder="e.g. new_myVariable" />
      </div>
      <div class="modal-field">
        <label class="modal-label" for="create-type-input">Type</label>
        <select id="create-type-input" class="modal-input">
          <option value="100000000">String</option>
          <option value="100000001">Number</option>
          <option value="100000002">Boolean</option>
          <option value="100000003">JSON</option>
        </select>
      </div>
      <div class="modal-field">
        <label class="modal-label" for="create-default-input">Default Value</label>
        <textarea id="create-default-input" class="modal-input" rows="2"></textarea>
      </div>
      <div class="modal-field">
        <label class="modal-label" for="create-value-input">Current Value</label>
        <textarea id="create-value-input" class="modal-input" rows="2"></textarea>
      </div>
      <div class="modal-actions">
        <button id="create-cancel" class="modal-btn modal-btn-cancel">Cancel</button>
        <button id="create-save" class="modal-btn modal-btn-save">Create</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.getElementById("create-display-input").focus();
}

function createVariable() {
  var displayName = document.getElementById("create-display-input").value.trim();
  var schemaName = document.getElementById("create-schema-input").value.trim();
  var type = document.getElementById("create-type-input").value;
  var defaultValue = document.getElementById("create-default-input").value;
  var value = document.getElementById("create-value-input").value;

  if (!schemaName) {
    paModal.alert("Schema name is required");
    return;
  }

  var createBtn = document.getElementById("create-save");
  createBtn.disabled = true;
  createBtn.textContent = "Creating...";

  chrome.runtime.sendMessage({
    action: "CREATE_ENV_VAR",
    displayName: displayName,
    schemaName: schemaName,
    type: type,
    defaultValue: defaultValue,
    value: value,
  });
}

function saveVariable() {
  var saveBtn = document.getElementById("modal-save");
  var definitionId = saveBtn.dataset.id;
  var valueId = saveBtn.dataset.valueid;
  var newValue = document.getElementById("modal-value-input").value;
  var newDefaultValue = document.getElementById("modal-default-input").value;

  var updateDefault = newDefaultValue !== allVariables.find((v) => v.id === definitionId).defaultValue;
  var updateValue = newValue !== (allVariables.find((v) => v.id === definitionId).value || "");

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  chrome.runtime.sendMessage({
    action: "SAVE_ENV_VAR",
    definitionId: definitionId,
    valueId: valueId,
    value: newValue,
    defaultValue: newDefaultValue,
    updateDefault: updateDefault,
    updateValue: updateValue,
  });
}

// Listen for save result from background
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "ENV_VAR_SAVED") {
    closeModal();
    getVariables();
  } else if (request.action === "ENV_VAR_SAVE_ERROR") {
    var saveBtn = document.getElementById("modal-save");
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
    var createBtn = document.getElementById("create-save");
    if (createBtn) {
      createBtn.disabled = false;
      createBtn.textContent = "Create";
    }
    paModal.alert("Error saving: " + request.error);
  } else if (request.action === "ENV_VAR_REFRESHED") {
    allVariables = request.data.variables;
    renderResults(request.data);
  }
});
