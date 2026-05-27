document.addEventListener("DOMContentLoaded", function () {
  getVariables();

  search = document.querySelector("input[name=filter]");
  search.addEventListener("input", function () {
    filterResults();
  });

  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("edit-btn")) {
      var id = e.target.dataset.id;
      var variable = allVariables.find((v) => v.id === id);
      if (variable) openEditModal(variable);
    }
    if (e.target.classList.contains("modal-overlay") || e.target.id === "modal-cancel") {
      closeModal();
    }
    if (e.target.id === "modal-save") {
      saveVariable();
    }
  });
});

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
      (v.value != null && v.value.toString().toLowerCase().includes(searchFilter)) ||
      (v.defaultValue != null && v.defaultValue.toString().toLowerCase().includes(searchFilter)),
  );
  renderResults({ variables: filtered });
}

function renderResults(data) {
  var variables = data.variables;

  var content = `<div style="margin-bottom: 8px; color: #6b7280; font-size: 0.875rem;">count: ${variables.length}</div>`;
  content += `<div class="table-container">
                <table>
                    <thead>
                        <tr>
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
    content += `<tr>
        <td>${d.name}</td>
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
      <h2 class="modal-title">${variable.name}</h2>
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
  var modal = document.getElementById("edit-modal");
  if (modal) modal.remove();
}

function saveVariable() {
  var saveBtn = document.getElementById("modal-save");
  var definitionId = saveBtn.dataset.id;
  var valueId = saveBtn.dataset.valueid;
  var newValue = document.getElementById("modal-value-input").value;
  var newDefaultValue = document.getElementById("modal-default-input").value;

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  chrome.runtime.sendMessage({
    action: "SAVE_ENV_VAR",
    definitionId: definitionId,
    valueId: valueId,
    value: newValue,
    defaultValue: newDefaultValue,
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
    alert("Error saving: " + request.error);
  }
});
