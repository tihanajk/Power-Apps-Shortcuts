document.addEventListener("DOMContentLoaded", function () {
  const openBtn = document.getElementById("open-shortcuts");
  if (openBtn) {
    openBtn.addEventListener("click", function () {
      chrome.runtime.sendMessage({ action: "openShortcuts" });
    });
  }

  setupWhatsNew();

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
        { command: "advanced_find", label: "Open advanced find", desc: "Open the Advanced Find window for the current environment." },
        { command: "open_list", label: "Open entity list", desc: "Prompt for a table name and open its list view." },
        { command: "open_record", label: "Open record", desc: "Prompt for a table and record id, then open that record." },
        { command: "open_maker", label: "Open Maker Portal", desc: "Open make.powerapps.com for this environment." },
        { command: "open_admin", label: "Open Admin Center", desc: "Open the Power Platform Admin Center for this environment." },
        { command: "copy_guid", label: "Copy record GUID", desc: "Copy the current record's GUID to the clipboard." },
      ],
    },
    {
      title: "Form & inspect",
      items: [
        { command: "god_mode", label: "Enable god mode", desc: "Make hidden fields visible, enable disabled fields and reveal all tabs/sections." },
        { command: "locate_on_form", label: "Locate field on the form", desc: "Find a field by name and highlight it on the form." },
        { command: "show_dirty_fields", label: "Show unsaved (dirty) fields", desc: "List the fields changed but not yet saved on the form." },
        {
          command: "all_fields",
          label: "Display all fields",
          desc: "List every column with values, types and formula definitions; export to Excel.",
        },
        { command: "see_optionsets", label: "See optionset values", desc: "Show the option set choices and values used on the form." },
        {
          command: "list_form_layout",
          label: "List tabs, sections & controls",
          desc: "Show the form's tab, section and control layout; export to Excel.",
        },
        {
          command: "list_script_events",
          label: "List script events on the form",
          desc: "List registered form/field event handlers and their libraries.",
        },
        { command: "ribbon_debug", label: "Toggle ribbon debug", desc: "Turn Dataverse ribbon debugging on or off for this page." },
        { command: "list_ribbon", label: "Inspect ribbon buttons", desc: "Browse ribbon/command bar buttons with rules and web resource sources." },
      ],
    },
    {
      title: "Data",
      items: [
        { command: "quick_field_update", label: "Quick field update", desc: "Set a field's value on the current record without opening the form." },
        {
          command: "touch_field",
          label: "Touch a field (trigger processes)",
          desc: "Re-save a field with its current value to fire background processes.",
        },
        { command: "execute_fetchxml", label: "Execute fetchXML", desc: "Run a FetchXML query and browse the results (paged 5000 at a time)." },
        {
          command: "show_audit_history",
          label: "Display audit history",
          desc: "Show the record's audit history with filtering, sorting and grouping.",
        },
        { command: "list_environment_variables", label: "Environment variables", desc: "List, create and edit environment variable values." },
      ],
    },
    {
      title: "Solutions & dev",
      items: [
        { command: "flow_dependency_check", label: "List process dependencies", desc: "Find flows and processes that depend on this table/field." },
        { command: "list_plugins", label: "List plugin steps", desc: "Show registered plugin steps in a tree with sync/async mode." },
        {
          command: "add_wr_to_solution",
          label: "Add web resource to a solution",
          desc: "Search web resources and add a match to a chosen solution.",
        },
        { command: "open_solution", label: "Open solution in Power Apps", desc: "Pick a solution and open it in the maker portal." },
        { command: "list_securityroles", label: "List security roles", desc: "List the current user's and teams' security roles." },
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
        if (c.desc) btn.title = c.desc;

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

// Changelog shown in the "What's new" popup. Add a new entry at the top whenever
// something major ships; only the most recent 5 versions are displayed.
const CHANGELOG = [
  {
    version: "2.0.0.33",
    notes: [
      "🚀 Blaze through big tables — FetchXML now pages 5,000 rows at a time with a Prev/Next selector.",
      "✅ Queries over 5,000 rows (or top greater than 5000) just work instead of erroring out.",
    ],
  },
  {
    version: "2.0.0.32",
    notes: [
      "👆 Touch a field to fire background processes without changing a thing.",
      "🧩 Jump straight to a solution in Power Apps.",
      "🧮 Peek at the formula behind calculated & rollup columns in Display all fields.",
    ],
  },
  {
    version: "2.0.0.31",
    notes: ["🎀 Inspect ribbon buttons (modern commands too) with location filters and a web resource source viewer."],
  },
  {
    version: "2.0.0.30",
    notes: ["🌱 Spin up new environment variables, plus dependency tab upgrades."],
  },
  {
    version: "2.0.0.29",
    notes: ["🧭 Added navigation controls to the web resource viewer."],
  },
  {
    version: "2.0.0.28",
    notes: ["📜 Audit history with grouping, sorting, operation filters and resizable columns."],
  },
];

function setupWhatsNew() {
  const openBtn = document.getElementById("whats-new");
  const overlay = document.getElementById("whatsnew-overlay");
  const closeBtn = document.getElementById("whatsnew-close");
  const body = document.getElementById("whatsnew-body");
  if (!openBtn || !overlay || !body) return;

  body.innerHTML = CHANGELOG.slice(0, 5)
    .map(function (entry, i) {
      const notes = entry.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("");
      const badge = i === 0 ? '<span class="wn-badge">Latest</span>' : "";
      return `<div class="wn-entry${i === 0 ? " wn-latest" : ""}"><div class="wn-version">v${escapeHtml(
        entry.version,
      )}${badge}</div><ul>${notes}</ul></div>`;
    })
    .join("");

  const open = () => overlay.classList.remove("hidden");
  const close = () => overlay.classList.add("hidden");

  openBtn.addEventListener("click", open);
  if (closeBtn) closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
