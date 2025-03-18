//add listener
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.message === "triggerGM") {
    executeInScript("YOU_HAVE_THE_SIGHT", "godMode.js");
  } else if (request.message === "ribbonDebug") {
    //tab url
    var url = location.href;

    if (url.includes("&ribbondebug=true")) url = url.replace("&ribbondebug=true", "");
    else url = url + "&ribbondebug=true";

    window.location.href = url;
  } else if (request.message === "advancedFind") {
    var url = location.href.split("&pagetype")[0];
    window.open(`${url}&pagetype=advancedfind`, "_blank");
  } else if (request.message === "locateOnForm") {
    executeInScript("LOCATE_ME", "locate.js");
  } else if (request.message === "openList") {
    var entityName = prompt("Entity name for view?");
    if (!entityName) return;

    var url = location.href.split("&pagetype")[0];

    window.open(`${url}&pagetype=entitylist&etn=${entityName}`, "_blank");
  } else if (request.message === "openRecord") {
    var entityName = prompt("Entity name of record?");
    if (!entityName) return;
    var recordId = prompt(`Id of ${entityName}?`);
    if (!recordId) return;

    var url = location.href.split("&pagetype")[0];

    window.open(`${url}&pagetype=entityrecord&etn=${entityName}&id=${recordId}`, "_blank");
  } else if (request.message === "seeOptions") {
    executeInScript("SHOW_OPTIONS", "dataverse.js");
  } else if (request.message == "listSecurityRoles") {
    executeInScript("LIST_SECURITY_ROLES", "dataverse.js");
  } else if (request.message == "quickFieldUpdate") {
    executeInScript("QUICK_FIELD_UPDATE", "dataverse.js");
  } else if (request.message == "executeFetchXml") {
    executeInScript("EXECUTE_FETCH_XML", "dataverse.js");
  } else if (request.message == "allFields") {
    executeInScript("SHOW_ALL_FIELDS", "dataverse.js");
  } else if (request.message == "flowDependencyCheck") {
    executeInScript("GET_FLOW_DEPENDENCIES", "dataverse.js");
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
  }
});
