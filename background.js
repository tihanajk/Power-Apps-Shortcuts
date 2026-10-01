chrome.action.onClicked.addListener((tab) => {
  // Send a message to the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, {
      message: "triggerGM",
    });
  });
});

var optionsetsData = [];
var securityData = [];
var doneFetchingSecurity = false;
var fetchData = [];
var entityName = "";
var fetchUrl = "";
var orgId = "";
var envId = "";
var securityUrl = "";
var allFields = [];
var fields = [];
var fieldsUrl = "";
var fieldsEntityMetadataId = null;
var fieldsSolutionId = null;
var fieldName = "";
var processes = [];
var url = "";
var dependencyExecutionTime = null;
var dependencyWrNameFilter = "";

var plugins = [];
var assemblyName = "";

var eventData;

var variablesData = [];
var envVarSourceTabId = null;

var formLayoutData = [];

var ribbonData = null;
var ribbonSourceTabId = null;

var auditHistoryData = [];
var doneFetchingAudit = false;

// Opens one of the extension's view pages either as a new browser tab or as an
// in-page modal (iframe overlay) in the current tab, based on the user's
// preference saved from the popup toggle.
function openView(path) {
  var fullUrl = chrome.runtime.getURL(path);
  chrome.storage.sync.get({ openMode: "tab" }, function (cfg) {
    if (cfg.openMode === "modal") {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { message: "openViewModal", url: fullUrl });
        } else {
          chrome.tabs.create({ url: fullUrl });
        }
      });
    } else {
      chrome.tabs.create({ url: fullUrl });
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openShortcuts") {
    chrome.tabs.create({ url: "edge://extensions/shortcuts" });
  } else if (request.action === "triggerCommand") {
    handleCommand(request.command);
  } else if (request.action === "showOptions") {
    optionsetsData = request.options;
    openView("tabs/options/options.html");
  } else if (request.action === "LOAD_OPTIONS") {
    sendResponse({ options: optionsetsData });
  } else if (request.action == "showSecurity") {
    securityData = request.roles;
    doneFetchingSecurity = request.last;
    orgId = request.orgId;
    envId = request.envId;
    securityUrl = request.url;
    if (request.first) openView("tabs/security/security.html");
  } else if (request.action === "GET_SECURITY") {
    sendResponse({ roles: securityData, last: doneFetchingSecurity, orgId: orgId, envId: envId, url: securityUrl });
  } else if (request.action === "showRetrieveResult") {
    fetchData = request.result;
    entityName = request.entityName;
    fetchUrl = request.url;
    openView("tabs/fetch/fetch.html");
  } else if (request.action === "GET_FETCH") {
    sendResponse({ fetchData: fetchData, fetchEntityName: entityName, url: fetchUrl });
  } else if (request.action === "showAllFields") {
    allFields = request.result;
    fields = request.fields;
    entityName = request.entityName;
    fieldsUrl = request.url;
    fieldsEntityMetadataId = request.entityMetadataId;
    fieldsSolutionId = request.solutionId;
    openView("tabs/fields/fields.html");
  } else if (request.action === "GET_ALL_FIELDS") {
    sendResponse({
      allFields: allFields,
      entityName: entityName,
      fields: fields,
      url: fieldsUrl,
      entityMetadataId: fieldsEntityMetadataId,
      solutionId: fieldsSolutionId,
    });
  } else if (request.action === "showFlowDependencies") {
    fieldName = request.data.fieldName;
    processes = request.data?.processes;
    url = request.data.url;
    envId = request.data.envId;
    dependencyExecutionTime = request.data?.executionTime ?? null;
    dependencyWrNameFilter = request.data?.wrNameFilter ?? "";

    if (request.data?.start) openView("tabs/dependencies/dependency.html");
  } else if (request.action === "GET_PROCESS_DEPENDENCIES") {
    sendResponse({
      processes: processes,
      fieldName: fieldName,
      url: url,
      envId: envId,
      executionTime: dependencyExecutionTime,
      wrNameFilter: dependencyWrNameFilter,
    });
  } else if (request.action === "showPlugins") {
    plugins = request.data.plugins;
    assemblyName = request.data.assemblyName;
    openView("tabs/plugins/plugins.html");
  } else if (request.action === "GET_PLUGINS") {
    sendResponse({ plugins: plugins, assemblyName: assemblyName });
  } else if (request.action == "showEvents") {
    eventData = request.data;
    openView("tabs/events/events.html");
  } else if (request.action == "GET_FORM_EVENTS") {
    sendResponse({ data: eventData });
  } else if (request.action == "showEnvironmentVariables") {
    variablesData = request.data;
    envVarSourceTabId = sender.tab?.id;
    openView("tabs/variables/variables.html");
  } else if (request.action == "GET_ENVIRONMENT_VARIABLES") {
    sendResponse({ data: variablesData });
  } else if (request.action === "SAVE_ENV_VAR") {
    if (envVarSourceTabId) {
      chrome.tabs.sendMessage(envVarSourceTabId, {
        message: "updateEnvVar",
        definitionId: request.definitionId,
        valueId: request.valueId,
        value: request.value,
        defaultValue: request.defaultValue,
        updateDefault: request.updateDefault,
        updateValue: request.updateValue,
      });
    }
  } else if (request.action === "REFRESH_ENV_VARS") {
    if (envVarSourceTabId) {
      chrome.tabs.sendMessage(envVarSourceTabId, { message: "refreshEnvVars" });
    }
  } else if (request.action === "CREATE_ENV_VAR") {
    if (envVarSourceTabId) {
      chrome.tabs.sendMessage(envVarSourceTabId, {
        message: "createEnvVar",
        displayName: request.displayName,
        schemaName: request.schemaName,
        type: request.type,
        defaultValue: request.defaultValue,
        value: request.value,
      });
    }
  } else if (request.action === "refreshedEnvironmentVariables") {
    variablesData = request.data;
    chrome.runtime.sendMessage({ action: "ENV_VAR_REFRESHED", data: request.data });
  } else if (request.action === "envVarSaved") {
    chrome.runtime.sendMessage({ action: "ENV_VAR_SAVED" });
  } else if (request.action === "envVarSaveError") {
    chrome.runtime.sendMessage({ action: "ENV_VAR_SAVE_ERROR", error: request.error });
  } else if (request.action == "showFormLayout") {
    formLayoutData = request.data;
    openView("tabs/formLayout/formLayout.html");
  } else if (request.action == "GET_FORM_LAYOUT") {
    sendResponse({ data: formLayoutData });
  } else if (request.action == "showRibbon") {
    ribbonData = request.data;
    ribbonSourceTabId = sender.tab?.id;
    if (request.data && request.data.loading) {
      openView("tabs/ribbon/ribbon.html");
    } else {
      chrome.runtime.sendMessage({ action: "RIBBON_READY", data: request.data });
    }
  } else if (request.action == "GET_RIBBON") {
    sendResponse({ data: ribbonData });
  } else if (request.action === "REQUEST_WR_CONTENT") {
    if (ribbonSourceTabId) {
      chrome.tabs.sendMessage(ribbonSourceTabId, {
        message: "fetchWrContent",
        name: request.name,
        requestId: request.requestId,
      });
    }
  } else if (request.action === "wrContentReady") {
    chrome.runtime.sendMessage({
      action: "WR_CONTENT_READY",
      name: request.name,
      content: request.content,
      requestId: request.requestId,
    });
  } else if (request.action == "showAuditHistory") {
    auditHistoryData = request.data;
    doneFetchingAudit = request.last;
    if (request.first) openView("tabs/auditHistory/auditHistory.html");
  } else if (request.action == "GET_AUDIT_HISTORY") {
    sendResponse({ data: auditHistoryData, last: doneFetchingAudit });
  }
});

chrome.commands.onCommand.addListener(function (command) {
  handleCommand(command);
});

function handleCommand(command) {
  switch (command) {
    case "god_mode":
      sendMessageToTab("triggerGM");
      break;
    case "ribbon_debug":
      sendMessageToTab("ribbonDebug");
      break;
    case "advanced_find":
      sendMessageToTab("advancedFind");
      break;
    case "locate_on_form":
      sendMessageToTab("locateOnForm");
      break;
    case "show_dirty_fields":
      sendMessageToTab("showDirtyFields");
      break;
    case "open_list":
      sendMessageToTab("openList");
      break;
    case "open_record":
      sendMessageToTab("openRecord");
      break;
    case "see_optionsets":
      sendMessageToTab("seeOptions");
      break;
    case "list_securityroles":
      sendMessageToTab("listSecurityRoles");
      break;
    case "quick_field_update":
      sendMessageToTab("quickFieldUpdate");
      break;
    case "touch_field":
      sendMessageToTab("touchField");
      break;
    case "execute_fetchxml":
      sendMessageToTab("executeFetchXml");
      break;
    case "all_fields":
      sendMessageToTab("allFields");
      break;
    case "flow_dependency_check":
      sendMessageToTab("flowDependencyCheck");
      break;
    case "copy_guid":
      sendMessageToTab("copyGuid");
      break;
    case "open_maker":
      sendMessageToTab("openMaker");
      break;
    case "open_admin":
      sendMessageToTab("openAdmin");
      break;
    case "open_solution":
      sendMessageToTab("openSolution");
      break;
    case "add_wr_to_solution":
      sendMessageToTab("addWebresourceToSolution");
      break;
    case "list_plugins":
      sendMessageToTab("listPlugins");
      break;
    case "list_script_events":
      sendMessageToTab("listEvents");
      break;
    case "list_environment_variables":
      sendMessageToTab("listEnvironmentVariables");
      break;
    case "list_form_layout":
      sendMessageToTab("listFormLayout");
      break;
    case "list_ribbon":
      sendMessageToTab("listRibbon");
      break;
    case "show_audit_history":
      sendMessageToTab("showAuditHistory");
      break;
    default:
      break;
  }
}

function sendMessageToTab(mess) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, {
      message: mess,
    });
  });
}
