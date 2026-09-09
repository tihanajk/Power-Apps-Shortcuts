document.addEventListener("DOMContentLoaded", function () {
  const openBtn = document.getElementById("open-shortcuts");
  if (openBtn) {
    openBtn.addEventListener("click", function () {
      chrome.runtime.sendMessage({ action: "openShortcuts" });
    });
  }

  const openModeToggle = document.getElementById("open-mode");
  if (openModeToggle) {
    chrome.storage.sync.get({ openMode: "tab" }, function (cfg) {
      openModeToggle.checked = cfg.openMode === "modal";
    });
    openModeToggle.addEventListener("change", function () {
      chrome.storage.sync.set({ openMode: openModeToggle.checked ? "modal" : "tab" });
    });
  }

  const groups = [
    {
      title: "Navigate",
      items: [
        { command: "advanced_find", label: "Open advanced find" },
        { command: "open_list", label: "Open entity list" },
        { command: "open_record", label: "Open record" },
        { command: "open_maker", label: "Open Maker Portal" },
        { command: "open_admin", label: "Open Admin Center" },
        { command: "copy_guid", label: "Copy record GUID" },
      ],
    },
    {
      title: "Form & inspect",
      items: [
        { command: "god_mode", label: "Enable god mode" },
        { command: "locate_on_form", label: "Locate field on the form" },
        { command: "show_dirty_fields", label: "Show unsaved (dirty) fields" },
        { command: "all_fields", label: "Display all fields" },
        { command: "see_optionsets", label: "See optionset values" },
        { command: "list_form_layout", label: "List tabs, sections & controls" },
        { command: "list_script_events", label: "List script events on the form" },
        { command: "ribbon_debug", label: "Toggle ribbon debug" },
      ],
    },
    {
      title: "Data",
      items: [
        { command: "quick_field_update", label: "Quick field update" },
        { command: "execute_fetchxml", label: "Execute fetchXML" },
        { command: "show_audit_history", label: "Display audit history" },
        { command: "list_environment_variables", label: "Environment variables" },
      ],
    },
    {
      title: "Solutions & dev",
      items: [
        { command: "flow_dependency_check", label: "List process dependencies" },
        { command: "list_plugins", label: "List plugin steps" },
        { command: "add_wr_to_solution", label: "Add web resource to a solution" },
        { command: "open_solution", label: "Open solution in Power Apps" },
        { command: "list_securityroles", label: "List security roles" },
      ],
    },
  ];

  const container = document.getElementById("action-buttons");
  const emptyState = document.getElementById("empty-state");
  const searchInput = document.getElementById("action-search");

  let activeIndex = -1;

  function render(shortcutMap) {
    container.innerHTML = "";
    groups.forEach(function (group) {
      const section = document.createElement("div");
      section.className = "action-group";

      const heading = document.createElement("div");
      heading.className = "group-title";
      heading.textContent = group.title;
      section.appendChild(heading);

      group.items.forEach(function (c) {
        const btn = document.createElement("button");
        btn.className = "action-btn";
        btn.dataset.label = c.label.toLowerCase();

        const label = document.createElement("span");
        label.className = "action-label";
        label.textContent = c.label;

        btn.appendChild(label);

        const shortcut = shortcutMap[c.command];
        if (shortcut) {
          const kbd = document.createElement("kbd");
          kbd.className = "action-kbd";
          kbd.textContent = shortcut;
          btn.appendChild(kbd);
        }

        btn.addEventListener("click", function () {
          chrome.runtime.sendMessage({ action: "triggerCommand", command: c.command });
          window.close();
        });

        btn.addEventListener("mousemove", function () {
          const btns = visibleButtons();
          const idx = btns.indexOf(btn);
          if (idx !== -1) setActive(idx);
        });

        section.appendChild(btn);
      });

      container.appendChild(section);
    });
  }

  function visibleButtons() {
    return Array.prototype.slice.call(container.querySelectorAll(".action-btn:not(.hidden)"));
  }

  function setActive(i) {
    const btns = visibleButtons();
    btns.forEach((b) => b.classList.remove("active"));
    activeIndex = i;
    if (i >= 0 && i < btns.length) {
      btns[i].classList.add("active");
      btns[i].scrollIntoView({ block: "nearest" });
    }
  }

  function applyFilter() {
    const term = (searchInput.value || "").toLowerCase();
    let anyVisible = false;
    container.querySelectorAll(".action-group").forEach(function (group) {
      let groupVisible = 0;
      group.querySelectorAll(".action-btn").forEach(function (btn) {
        const match = btn.dataset.label.includes(term);
        btn.classList.toggle("hidden", !match);
        if (match) groupVisible++;
      });
      group.classList.toggle("hidden", groupVisible === 0);
      if (groupVisible > 0) anyVisible = true;
    });
    if (emptyState) emptyState.classList.toggle("hidden", anyVisible);
    setActive(-1);
  }

  if (chrome.commands && chrome.commands.getAll) {
    chrome.commands.getAll(function (cmds) {
      const map = {};
      (cmds || []).forEach(function (c) {
        if (c.shortcut) map[c.name] = c.shortcut;
      });
      render(map);
    });
  } else {
    render({});
  }

  if (searchInput) {
    searchInput.focus();
    searchInput.addEventListener("input", applyFilter);
    searchInput.addEventListener("keydown", function (e) {
      const btns = visibleButtons();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive(activeIndex + 1 >= btns.length ? 0 : activeIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(activeIndex <= 0 ? btns.length - 1 : activeIndex - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = activeIndex >= 0 ? btns[activeIndex] : btns[0];
        if (target) target.click();
      }
    });
  }
});
