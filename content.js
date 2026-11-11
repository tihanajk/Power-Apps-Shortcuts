// Inject the shared modal helper into the page context so dataverse.js can use it.
(function injectPageModal() {
  if (document.getElementById("pa-modal-script")) return;
  var s = document.createElement("script");
  s.id = "pa-modal-script";
  s.src = chrome.runtime.getURL("modal.js");
  (document.head || document.documentElement).appendChild(s);
})();

//add listener
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  const execute = (cmd, data) => executeInScript(cmd, "dataverse.js", data);
  const baseUrl = () => location.href.split("&pagetype")[0];

  switch (request.message) {
    case "triggerGM":
      execute("YOU_HAVE_THE_SIGHT");
      break;

    case "openViewModal":
      openViewInModal(request.url);
      break;

    case "ribbonDebug":
      openRibbonDebugDashboard();
      break;

    case "advancedFind":
      window.open(`${baseUrl()}&pagetype=advancedfind`, "_blank");
      break;

    case "locateOnForm":
      execute("LOCATE_ME");
      break;

    case "showDirtyFields":
      execute("SHOW_DIRTY_FIELDS");
      break;

    case "openList": {
      (async () => {
        const entityName = await paModal.prompt("Entity name for view?");
        if (!entityName) return;
        window.open(`${baseUrl()}&pagetype=entitylist&etn=${entityName}`, "_blank");
      })();
      break;
    }

    case "openRecord": {
      (async () => {
        const res = await paModal.form("Open record", [
          { name: "entityName", label: "Entity name", placeholder: "e.g. account" },
          { name: "recordId", label: "Record id (GUID)", placeholder: "e.g. 00000000-0000-0000-0000-000000000000" },
        ]);
        if (!res || !res.entityName || !res.recordId) return;
        window.open(`${baseUrl()}&pagetype=entityrecord&etn=${res.entityName}&id=${res.recordId}`, "_blank");
      })();
      break;
    }

    case "seeOptions":
      execute("SHOW_OPTIONS");
      break;

    case "listSecurityRoles":
      execute("LIST_SECURITY_ROLES");
      break;

    case "quickFieldUpdate":
      execute("QUICK_FIELD_UPDATE");
      break;

    case "touchField":
      execute("TOUCH_FIELD");
      break;

    case "executeFetchXml":
      execute("EXECUTE_FETCH_XML");
      break;

    case "allFields":
      execute("SHOW_ALL_FIELDS");
      break;

    case "flowDependencyCheck":
      execute("GET_FLOW_DEPENDENCIES");
      break;

    case "copyGuid": {
      let guid = null;
      try {
        // Records open with ?...&id=<guid> (sometimes URL-encoded with %7b..%7d braces)
        const match = location.href.match(/[?&]id=([^&]+)/i);
        if (match) {
          guid = decodeURIComponent(match[1]).replace(/[{}]/g, "").trim();
        }
      } catch (e) {
        guid = null;
      }

      const isGuid = (g) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(g || "");

      if (isGuid(guid)) {
        navigator.clipboard.writeText(guid);
        paModal.alert("copied " + guid + " to clipboard");
      } else {
        // No id in the URL (e.g. a list/grid page) - ask the form via Xrm
        execute("COPY_GUID");
      }
      break;
    }

    case "addWebresourceToSolution":
      execute("ADD_WR_TO_SOL");
      break;

    case "openMaker":
      execute("OPEN_MAKER");
      break;

    case "openAdmin":
      execute("OPEN_ADMIN");
      break;

    case "showContextInfo":
      execute("SHOW_CONTEXT_INFO");
      break;

    case "openSolution":
      execute("OPEN_SOLUTION");
      break;

    case "listPlugins":
      execute("LIST_PLUGINS");
      break;

    case "listEvents":
      execute("LIST_EVENTS");
      break;

    case "disableFormHandlers":
      openDisableFormHandlersDashboard();
      break;

    case "listEnvironmentVariables":
      execute("LIST_ENV_VARIABLES");
      break;

    case "listFormLayout":
      execute("LIST_FORM_LAYOUT");
      break;

    case "listRibbon":
      execute("LIST_RIBBON");
      break;

    case "showBusinessRule":
      openBusinessRuleCode();
      break;

    case "showAuditHistory":
      execute("SHOW_AUDIT_HISTORY");
      break;

    case "refreshEnvVars":
      execute("LIST_ENV_VARIABLES", { refresh: true });
      break;

    case "fetchWrContent":
      execute("FETCH_WR_CONTENT", { name: request.name, requestId: request.requestId });
      break;

    case "fetchPage":
      execute("FETCH_PAGE", { fetchXml: request.fetchXml, entitySetName: request.entitySetName, page: request.page });
      break;

    case "updateEnvVar": {
      // window._envVarUpdate = {
      //   definitionId: request.definitionId,
      //   valueId: request.valueId,
      //   value: request.value,
      //   defaultValue: request.defaultValue,
      // };

      var data = {
        definitionId: request.definitionId,
        valueId: request.valueId,
        value: request.value,
        defaultValue: request.defaultValue,
        updateDefault: request.updateDefault,
        updateValue: request.updateValue,
      };
      execute("UPDATE_ENV_VARIABLE", data);
      break;
    }

    case "createEnvVar": {
      var createData = {
        displayName: request.displayName,
        schemaName: request.schemaName,
        type: request.type,
        defaultValue: request.defaultValue,
        value: request.value,
      };
      execute("CREATE_ENV_VARIABLE", createData);
      break;
    }
  }
});

// Reusable toggle dashboard: shows a list of rows, each with a status pill and
// an on/off switch, plus an Apply button. Callers own the draft state via each
// row's get()/set() and provide onApply() to persist (usually a URL + reload).
//
// config: {
//   title, note?, applyText?, onText?, offText?,
//   rows: [{ label, sub?, master?, get():bool, set(v), locked?():bool, onText?, offText? }],
//   onApply(close)
// }
function openFlagDashboard(config) {
  const existing = document.getElementById("pa-fdash-overlay");
  if (existing) existing.remove();

  if (!document.getElementById("pa-fdash-style")) {
    const style = document.createElement("style");
    style.id = "pa-fdash-style";
    style.textContent = `
      #pa-fdash-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif}
      .pa-fdash-card{background:#fff;color:#1f2937;width:min(460px,calc(100vw - 40px));border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.35);overflow:hidden;display:flex;flex-direction:column}
      .pa-fdash-header{display:flex;align-items:center;gap:8px;padding:16px 18px;border-bottom:1px solid #eef0f3}
      .pa-fdash-title{flex:1;font-weight:600;font-size:15px}
      .pa-fdash-close{width:26px;height:26px;border:none;border-radius:6px;background:transparent;color:#6b7280;cursor:pointer;font-size:18px;line-height:1}
      .pa-fdash-close:hover{background:#f3f4f6;color:#1f2937}
      .pa-fdash-body{padding:8px 18px 14px}
      .pa-fdash-row{display:flex;align-items:center;gap:10px;padding:12px 2px;border-bottom:1px solid #f1f3f5}
      .pa-fdash-row:last-child{border-bottom:none}
      .pa-fdash-row-master{margin:6px -18px 4px;padding:12px 18px;background:#f8fafc;border-bottom:1px solid #eef0f3}
      .pa-fdash-name{flex:1;font-size:14px;font-weight:500}
      .pa-fdash-row-master .pa-fdash-name{font-weight:600}
      .pa-fdash-sub{display:block;font-size:11.5px;font-weight:400;color:#9ca3af;margin-top:2px}
      .pa-fdash-pill{font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;letter-spacing:.2px}
      .pa-fdash-pill.on{background:#fde8e8;color:#c0392b}
      .pa-fdash-pill.off{background:#e6f6ec;color:#1e874b}
      .pa-fdash-switch{position:relative;width:40px;height:22px;flex:none;cursor:pointer}
      .pa-fdash-switch input{opacity:0;width:0;height:0;position:absolute}
      .pa-fdash-slider{position:absolute;inset:0;background:#cbd5e1;border-radius:999px;transition:.15s}
      .pa-fdash-slider::before{content:"";position:absolute;width:16px;height:16px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.15s;box-shadow:0 1px 2px rgba(0,0,0,.3)}
      .pa-fdash-switch input:checked + .pa-fdash-slider{background:#c0392b}
      .pa-fdash-switch input:checked + .pa-fdash-slider::before{transform:translateX(18px)}
      .pa-fdash-switch input:disabled + .pa-fdash-slider{opacity:.5;cursor:not-allowed}
      .pa-fdash-footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid #eef0f3;background:#fafbfc}
      .pa-fdash-note{margin-right:auto;align-self:center;font-size:11.5px;color:#9ca3af}
      .pa-fdash-btn{padding:7px 16px;border-radius:6px;border:1px solid transparent;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit}
      .pa-fdash-btn-primary{background:#6a7e9d;color:#fff}
      .pa-fdash-btn-primary:hover{background:#5a6d8a}
      .pa-fdash-btn-secondary{background:#fff;color:#374151;border-color:#d1d5db}
      .pa-fdash-btn-secondary:hover{background:#f3f4f6}
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  const overlay = document.createElement("div");
  overlay.id = "pa-fdash-overlay";

  const card = document.createElement("div");
  card.className = "pa-fdash-card";

  const header = document.createElement("div");
  header.className = "pa-fdash-header";
  const title = document.createElement("div");
  title.className = "pa-fdash-title";
  title.textContent = config.title || "Flags";
  const closeBtn = document.createElement("button");
  closeBtn.className = "pa-fdash-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.title = "Close";
  header.appendChild(title);
  header.appendChild(closeBtn);

  const bodyEl = document.createElement("div");
  bodyEl.className = "pa-fdash-body";

  const rows = [];
  const refreshAll = () => rows.forEach((r) => r.sync());

  // Builds one toggle row and keeps its pill/switch in sync with the row state.
  function makeRow(cfg) {
    const row = document.createElement("div");
    row.className = "pa-fdash-row" + (cfg.master ? " pa-fdash-row-master" : "");

    const name = document.createElement("div");
    name.className = "pa-fdash-name";
    name.textContent = cfg.label;
    if (cfg.sub) {
      const sub = document.createElement("span");
      sub.className = "pa-fdash-sub";
      sub.textContent = cfg.sub;
      name.appendChild(sub);
    }

    const pill = document.createElement("span");
    pill.className = "pa-fdash-pill";

    const sw = document.createElement("label");
    sw.className = "pa-fdash-switch";
    const input = document.createElement("input");
    input.type = "checkbox";
    const slider = document.createElement("span");
    slider.className = "pa-fdash-slider";
    sw.appendChild(input);
    sw.appendChild(slider);

    row.appendChild(name);
    row.appendChild(pill);
    row.appendChild(sw);

    const onText = cfg.onText || config.onText || "Disabled";
    const offText = cfg.offText || config.offText || "Enabled";

    const sync = () => {
      const on = cfg.get();
      input.checked = on;
      input.disabled = typeof cfg.locked === "function" ? cfg.locked() : false;
      pill.textContent = on ? onText : offText;
      pill.className = "pa-fdash-pill " + (on ? "on" : "off");
    };

    input.addEventListener("change", () => {
      cfg.set(input.checked);
      refreshAll();
    });

    sync();
    bodyEl.appendChild(row);
    rows.push({ sync });
  }

  (config.rows || []).forEach(makeRow);

  const footer = document.createElement("div");
  footer.className = "pa-fdash-footer";
  const note = document.createElement("span");
  note.className = "pa-fdash-note";
  note.textContent = config.note != null ? config.note : "Applies on reload";
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "pa-fdash-btn pa-fdash-btn-secondary";
  cancelBtn.textContent = "Cancel";
  const applyBtn = document.createElement("button");
  applyBtn.className = "pa-fdash-btn pa-fdash-btn-primary";
  applyBtn.textContent = config.applyText || "Apply & reload";
  footer.appendChild(note);
  footer.appendChild(cancelBtn);
  footer.appendChild(applyBtn);

  function close() {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) {
    if (e.key === "Escape") close();
  }

  closeBtn.addEventListener("click", close);
  cancelBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  applyBtn.addEventListener("click", () => {
    if (typeof config.onApply === "function") config.onApply(close);
    else close();
  });
  document.addEventListener("keydown", onKey);

  card.appendChild(header);
  card.appendChild(bodyEl);
  card.appendChild(footer);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// Removes a URL query flag (e.g. "ribbondebug=true") and tidies separators.
function stripUrlFlag(url, pattern) {
  return url
    .replace(pattern, (_m, p1) => (p1 === "?" ? "?" : ""))
    .replace(/\?&/, "?")
    .replace(/&&+/g, "&")
    .replace(/[?&]$/, "");
}

// Dashboard for the flags=DisableFormHandlers URL flag.
function openDisableFormHandlersDashboard() {
  const HANDLERS = [
    { key: "onload", label: "OnLoad" },
    { key: "onsave", label: "OnSave" },
    { key: "onchange", label: "OnChange" },
    { key: "businessrule", label: "Business rules" },
  ];

  // Read the current flag from the URL.
  const m = location.href.match(/[?&]flags=DisableFormHandlers=([^&]*)/i);
  const raw = m ? decodeURIComponent(m[1] || "").toLowerCase() : "";
  const draft = { all: raw === "true", handlers: { onload: false, onsave: false, onchange: false, businessrule: false } };
  if (raw && raw !== "true") {
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((h) => (draft.handlers[h] = true));
  }

  openFlagDashboard({
    title: "Form event handlers",
    rows: [
      {
        master: true,
        label: "Disable all handlers",
        sub: "flags=DisableFormHandlers=true",
        get: () => draft.all,
        set: (v) => {
          draft.all = v;
          if (!v) HANDLERS.forEach((h) => (draft.handlers[h.key] = false));
        },
      },
      ...HANDLERS.map((h) => ({
        label: h.label,
        locked: () => draft.all,
        get: () => draft.all || !!draft.handlers[h.key],
        set: (v) => (draft.handlers[h.key] = v),
      })),
    ],
    onApply: () => {
      let url = stripUrlFlag(location.href, /([?&])flags=DisableFormHandlers=[^&]*/i);
      const selected = HANDLERS.filter((h) => draft.handlers[h.key]).map((h) => h.key);
      let value = "";
      if (draft.all || selected.length === HANDLERS.length) value = "true";
      else if (selected.length) value = selected.join(",");
      if (value) url += `${url.includes("?") ? "&" : "?"}flags=DisableFormHandlers=${value}`;
      window.location.href = url;
    },
  });
}

// Dashboard for the ribbondebug URL flag (command-bar debugging).
function openRibbonDebugDashboard() {
  const draft = { on: /[?&]ribbondebug=true/i.test(location.href) };
  openFlagDashboard({
    title: "Ribbon debug",
    onText: "On",
    offText: "Off",
    rows: [
      {
        label: "Ribbon debug",
        sub: "ribbondebug=true",
        get: () => draft.on,
        set: (v) => (draft.on = v),
      },
    ],
    onApply: () => {
      let url = stripUrlFlag(location.href, /([?&])ribbondebug=true/i);
      if (draft.on) url += `${url.includes("?") ? "&" : "?"}ribbondebug=true`;
      window.location.href = url;
    },
  });
}

// Shows the definition behind the business rule open in the designer (its
// workflow clientdata JSON, or xaml) in the shared code viewer.
function openBusinessRuleCode() {
  var GUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  function findWorkflowId() {
    // 1. ?id=<guid> in the URL (braces may be URL-encoded).
    var m = location.href.match(/[?&]id=([^&]+)/i);
    if (m) {
      var g = decodeURIComponent(m[1]).replace(/[{}]/g, "").trim();
      if (GUID.test(g)) return g.match(GUID)[0];
    }
    // 2. A workflows(<id>) Web API call the page already made.
    var reApi = /\/api\/data\/v9\.\d+\/workflows\(([0-9a-f-]{36})\)/i;
    try {
      var entries = performance.getEntriesByType("resource") || [];
      for (var i = 0; i < entries.length; i++) {
        var h = (entries[i].name || "").match(reApi);
        if (h) return h[1];
      }
    } catch (e) {
      /* ignore */
    }
    var h2 = document.documentElement.outerHTML.match(reApi);
    return h2 ? h2[1] : "";
  }

  function formatXml(xml) {
    var PAD = "  ";
    // Break only between adjacent tags so text content stays with its element.
    var normalized = String(xml)
      .replace(/\r?\n/g, "")
      .replace(/>\s+</g, "><")
      .replace(/(>)(<)/g, "$1\n$2")
      .trim();
    var pad = 0;
    return normalized
      .split("\n")
      .map(function (raw) {
        var node = raw.trim();
        if (!node) return "";
        var indentChange = 0;
        if (/^<\/[^>]+>$/.test(node)) {
          // closing tag
          pad = Math.max(pad - 1, 0);
        } else if (/^<[?!]/.test(node) || /\/>$/.test(node)) {
          // declaration, comment, or self-closing: no change
        } else if (/^<[^/][^>]*>.*<\/[^>]+>$/.test(node)) {
          // element opened and closed on the same line: no change
        } else if (/^<[^/][^>]*>$/.test(node)) {
          // opening tag only
          indentChange = 1;
        }
        var out = PAD.repeat(pad) + node;
        pad += indentChange;
        return out;
      })
      .filter(function (l) {
        return l.length;
      })
      .join("\n");
  }

  var id = findWorkflowId();
  if (!id) {
    paModal.alert("Couldn't find a business rule id. Open the business rule in its designer first, then try again.", { title: "Business rule code" });
    return;
  }

  var url = location.origin + "/api/data/v9.2/workflows(" + id + ")?$select=name,clientdata,xaml";

  function show(resText) {
    var title = "Business rule";
    var text = resText;
    var file = "businessrule.json";
    try {
      var data = JSON.parse(resText);
      if (data.name) title = "Business rule: " + data.name;
      if (data.xaml) {
        text = formatXml(data.xaml);
        file = "businessrule.xml";
      } else if (data.clientdata) {
        text = JSON.stringify(JSON.parse(data.clientdata), null, 2);
      } else {
        text = JSON.stringify(data, null, 2);
      }
    } catch (e) {
      /* show raw text */
    }
    if (window.paShowCode) window.paShowCode(title, text, file);
    else window.open(url, "_blank");
  }

  // Fetch via the background worker (host permissions + org cookies) so it isn't
  // rejected the way a plain same-origin Web API fetch can be.
  chrome.runtime.sendMessage({ action: "makerFetchJson", url: url }, function (res) {
    if (chrome.runtime.lastError || !res || !res.ok || !res.text) {
      window.open(url, "_blank");
      return;
    }
    show(res.text);
  });
}

// Opens one of the extension's view pages inside an in-page modal overlay
// (an iframe) so the results are shown in the current tab instead of a new one.
function openViewInModal(url) {
  var existing = document.getElementById("pa-view-modal-overlay");
  if (existing) existing.remove();

  var overlay = document.createElement("div");
  overlay.id = "pa-view-modal-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;";

  var container = document.createElement("div");
  container.style.cssText =
    "position:relative;width:92vw;height:90vh;background:#fff;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden;display:flex;flex-direction:column;";

  var closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.title = "Close (Esc)";
  closeBtn.style.cssText =
    "position:absolute;top:8px;right:10px;z-index:1;width:28px;height:28px;border:none;border-radius:6px;background:rgba(0,0,0,.06);color:#333;font-size:15px;cursor:pointer;line-height:1;";
  closeBtn.addEventListener("mouseenter", function () {
    closeBtn.style.background = "rgba(0,0,0,.14)";
  });
  closeBtn.addEventListener("mouseleave", function () {
    closeBtn.style.background = "rgba(0,0,0,.06)";
  });

  var iframe = document.createElement("iframe");
  iframe.src = url;
  iframe.allow = "clipboard-write";
  iframe.style.cssText = "flex:1;width:100%;height:100%;border:none;";

  function close() {
    overlay.remove();
    document.removeEventListener("keydown", onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") close();
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", onKeyDown);

  container.appendChild(closeBtn);
  container.appendChild(iframe);
  overlay.appendChild(container);
  document.body.appendChild(overlay);
}

function executeInScript(message, scriptName, dataForScript) {
  var script = document.createElement("script");
  script.type = "text/javascript";

  script.src = chrome.runtime.getURL(scriptName);
  document.head.appendChild(script);

  script.onload = function () {
    window.postMessage({ type: message, dataForScript: dataForScript }, "*");
  };

  script.remove();
}

// Listen for messages from the injected script
window.addEventListener("message", (event) => {
  // Ensure we're receiving a message from our injected script
  if (event.source === window && event.data.type === "GIVE_ME_OPTIONS") {
    chrome.runtime.sendMessage({
      action: "showOptions",
      options: event.data.options,
      entityName: event.data.entityName,
      recordId: event.data.recordId,
      primaryName: event.data.primaryName,
    });
  } else if (event.source === window && event.data.type === "GIVE_ME_SECURITY") {
    chrome.runtime.sendMessage({
      action: "showSecurity",
      roles: event.data.roles,
      first: event.data.first,
      last: event.data.last,
      orgId: event.data.orgId,
      envId: event.data.envId,
      url: event.data.url,
    });
  } else if (event.source === window && event.data.type === "GIVE_ME_FETCH_RESULTS") {
    chrome.runtime.sendMessage({
      action: "showRetrieveResult",
      loading: event.data.loading,
      result: event.data.result,
      entityName: event.data.entityName,
      url: event.data.url,
      page: event.data.page,
      hasMore: event.data.hasMore,
      paged: event.data.paged,
      entitySetName: event.data.entitySetName,
      fetchXml: event.data.fetchXml,
    });
  } else if (event.source === window && event.data.type === "GIVE_ME_FETCH_PAGE") {
    chrome.runtime.sendMessage({
      action: "fetchPageReady",
      result: event.data.result,
      page: event.data.page,
      hasMore: event.data.hasMore,
      error: event.data.error,
    });
  } else if (event.source === window && event.data.type === "GIVE_ME_ALL_FIELDS") {
    chrome.runtime.sendMessage({
      action: "showAllFields",
      result: event.data.result,
      fields: event.data.fields,
      entityName: event.data.entityName,
      recordId: event.data.recordId,
      primaryName: event.data.primaryName,
      url: event.data.url,
      entityMetadataId: event.data.entityMetadataId,
      solutionId: event.data.solutionId,
    });
  } else if (event.source === window && event.data.type === "GIVE_ME_FLOW_DEPENDENCIES") {
    chrome.runtime.sendMessage({
      action: "showFlowDependencies",
      data: event.data,
    });
  } else if (event.source === window && event.data.type === "GIVE_ME_PLUGINS") {
    chrome.runtime.sendMessage({
      action: "showPlugins",
      data: event.data,
    });
  } else if (event.source === window && event.data.type === "GIVE_ME_EVENTS") {
    chrome.runtime.sendMessage({
      action: "showEvents",
      data: event.data,
    });
  } else if (event.source === window && event.data.type === "GIVE_ME_FORM_LAYOUT") {
    chrome.runtime.sendMessage({
      action: "showFormLayout",
      data: event.data,
    });
  } else if (event.source === window && event.data.type === "GIVE_ME_CONTEXT_INFO") {
    chrome.runtime.sendMessage({
      action: "showContextInfo",
      data: event.data.data,
    });
  } else if (event.source === window && event.data.type === "GIVE_ME_RIBBON") {
    chrome.runtime.sendMessage({
      action: "showRibbon",
      data: event.data,
    });
  } else if (event.source === window && event.data.type === "GIVE_ME_WR_CONTENT") {
    chrome.runtime.sendMessage({
      action: "wrContentReady",
      name: event.data.name,
      content: event.data.content,
      requestId: event.data.requestId,
    });
  } else if (event.source === window && event.data.type === "GIVE_ME_AUDIT_HISTORY") {
    chrome.runtime.sendMessage({
      action: "showAuditHistory",
      data: event.data,
      first: event.data.first,
      last: event.data.last,
    });
  } else if (event.source === window && event.data.type === "GIVE_ME_ENV_VARIABLES") {
    if (event.data.refresh) {
      chrome.runtime.sendMessage({
        action: "refreshedEnvironmentVariables",
        data: event.data,
      });
    } else {
      chrome.runtime.sendMessage({
        action: "showEnvironmentVariables",
        data: event.data,
      });
    }
  } else if (event.source === window && event.data.type === "ENV_VAR_SAVED") {
    chrome.runtime.sendMessage({ action: "envVarSaved" });
  } else if (event.source === window && event.data.type === "ENV_VAR_SAVE_ERROR") {
    chrome.runtime.sendMessage({ action: "envVarSaveError", error: event.data.error });
  }
});
