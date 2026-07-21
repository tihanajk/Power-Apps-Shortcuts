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

    case "ribbonDebug": {
      let url = location.href;
      url = url.includes("&ribbondebug=true") ? url.replace("&ribbondebug=true", "") : url + "&ribbondebug=true";
      window.location.href = url;
      break;
    }

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

    case "listPlugins":
      execute("LIST_PLUGINS");
      break;

    case "listEvents":
      execute("LIST_EVENTS");
      break;

    case "listEnvironmentVariables":
      execute("LIST_ENV_VARIABLES");
      break;

    case "listFormLayout":
      execute("LIST_FORM_LAYOUT");
      break;

    case "showAuditHistory":
      execute("SHOW_AUDIT_HISTORY");
      break;

    case "refreshEnvVars":
      execute("LIST_ENV_VARIABLES", { refresh: true });
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
  }
});

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
      result: event.data.result,
      entityName: event.data.entityName,
      url: event.data.url,
    });
  } else if (event.source === window && event.data.type === "GIVE_ME_ALL_FIELDS") {
    chrome.runtime.sendMessage({
      action: "showAllFields",
      result: event.data.result,
      fields: event.data.fields,
      entityName: event.data.entityName,
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
