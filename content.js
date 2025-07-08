//add listener
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  const execute = (cmd) => executeInScript(cmd, "dataverse.js");
  const baseUrl = () => location.href.split("&pagetype")[0];

  switch (request.message) {
    case "triggerGM":
      execute("YOU_HAVE_THE_SIGHT");
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

    case "openList": {
      const entityName = prompt("Entity name for view?");
      if (!entityName) return;
      window.open(`${baseUrl()}&pagetype=entitylist&etn=${entityName}`, "_blank");
      break;
    }

    case "openRecord": {
      const entityName = prompt("Entity name of record?");
      if (!entityName) return;
      const recordId = prompt(`Id of ${entityName}?`);
      if (!recordId) return;
      window.open(`${baseUrl()}&pagetype=entityrecord&etn=${entityName}&id=${recordId}`, "_blank");
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
      const url = location.href.split("&id=")[1];
      const guid = url.split("&")[0];
      navigator.clipboard.writeText(guid);
      alert("copied " + guid + " to clipboard");
      break;
    }

    case "addWebresourceToSolution":
      execute("ADD_WR_TO_SOL");
      break;

    case "listPlugins":
      execute("LIST_PLUGINS");
      break;

    case "listEvents":
      execute("LIST_EVENTS");
      break;
  }
});

function executeInScript(message, scriptName, dataForScript) {
  var script = document.createElement("script");
  script.type = "text/javascript";

  script.src = chrome.runtime.getURL(scriptName);
  document.head.appendChild(script);

  script.onload = function () {
    window.postMessage({ type: message }, "*");
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
    });
  } else if (event.source === window && event.data.type === "GIVE_ME_FETCH_RESULTS") {
    chrome.runtime.sendMessage({
      action: "showRetrieveResult",
      result: event.data.result,
      entityName: event.data.entityName,
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
  }
});
