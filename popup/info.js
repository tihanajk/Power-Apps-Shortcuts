document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("open-shortcuts");
  if (!button) return;
  button.addEventListener("click", function () {
    chrome.runtime.sendMessage({ action: "openShortcuts" });
  });

  const commands = [
    { command: "god_mode", label: "Enable god mode" },
    { command: "ribbon_debug", label: "Toggle ribbon debug" },
    { command: "advanced_find", label: "Open advanced find" },
    { command: "locate_on_form", label: "Locate field on the form" },
    { command: "show_dirty_fields", label: "Show unsaved (dirty) fields" },
    { command: "open_list", label: "Open entity list" },
    { command: "open_record", label: "Open record" },
    { command: "see_optionsets", label: "See optionset values" },
    { command: "list_securityroles", label: "List security roles" },
    { command: "quick_field_update", label: "Quick field update" },
    { command: "execute_fetchxml", label: "Execute fetchXML" },
    { command: "all_fields", label: "Display all fields" },
    { command: "flow_dependency_check", label: "List process dependencies" },
    { command: "copy_guid", label: "Copy record guid to clipboard" },
    { command: "add_wr_to_solution", label: "Add webresource to a solution" },
    { command: "list_plugins", label: "List plugin steps" },
    { command: "list_script_events", label: "List all script events on the form" },
    { command: "list_environment_variables", label: "List and edit all environment variables" },
    { command: "list_form_layout", label: "List form tabs, sections and controls" },
    { command: "show_audit_history", label: "Display audit history for the record" },
  ];

  const container = document.getElementById("action-buttons");
  commands.forEach(function (c) {
    const btn = document.createElement("button");
    btn.className = "action-btn";
    btn.textContent = c.label;
    btn.addEventListener("click", function () {
      chrome.runtime.sendMessage({ action: "triggerCommand", command: c.command });
      window.close();
    });
    container.appendChild(btn);
  });

  const searchInput = document.getElementById("action-search");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      const term = searchInput.value.toLowerCase();
      container.querySelectorAll(".action-btn").forEach(function (btn) {
        btn.classList.toggle("hidden", !btn.textContent.toLowerCase().includes(term));
      });
    });
  }
});
