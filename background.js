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
var orgId = "";
var envId = "";
var allFields = [];
var fields = [];
var fieldName = "";
var processes = [];
var url = "";

var plugins = [];
var assemblyName = "";

var eventData;

var variablesData = [];
var envVarSourceTabId = null;

var formLayoutData = [];

var auditHistoryData = [];
var doneFetchingAudit = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openShortcuts") {
    chrome.tabs.create({ url: "edge://extensions/shortcuts" });
  } else if (request.action === "showOptions") {
    optionsetsData = request.options;
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/options/options.html") });
  } else if (request.action === "LOAD_OPTIONS") {
    sendResponse({ options: optionsetsData });
  } else if (request.action == "showSecurity") {
    securityData = request.roles;
    doneFetchingSecurity = request.last;
    orgId = request.orgId;
    envId = request.envId;
    if (request.first) chrome.tabs.create({ url: chrome.runtime.getURL("tabs/security/security.html") });
  } else if (request.action === "GET_SECURITY") {
    sendResponse({ roles: securityData, last: doneFetchingSecurity, orgId: orgId, envId: envId });
  } else if (request.action === "showRetrieveResult") {
    fetchData = request.result;
    entityName = request.entityName;
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/fetch/fetch.html") });
  } else if (request.action === "GET_FETCH") {
    sendResponse({ fetchData: fetchData, fetchEntityName: entityName });
  } else if (request.action === "showAllFields") {
    allFields = request.result;
    fields = request.fields;
    entityName = request.entityName;
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/fields/fields.html") });
  } else if (request.action === "GET_ALL_FIELDS") {
    sendResponse({ allFields: allFields, entityName: entityName, fields: fields });
  } else if (request.action === "showFlowDependencies") {
    fieldName = request.data.fieldName;
    processes = request.data?.processes;
    url = request.data.url;
    envId = request.data.envId;

    if (request.data?.start) chrome.tabs.create({ url: chrome.runtime.getURL("tabs/dependencies/dependency.html") });
  } else if (request.action === "GET_PROCESS_DEPENDENCIES") {
    sendResponse({ processes: processes, fieldName: fieldName, url: url, envId: envId });
  } else if (request.action === "showPlugins") {
    plugins = request.data.plugins;
    assemblyName = request.data.assemblyName;
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/plugins/plugins.html") });
  } else if (request.action === "GET_PLUGINS") {
    sendResponse({ plugins: plugins, assemblyName: assemblyName });
  } else if (request.action == "showEvents") {
    eventData = request.data;
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/events/events.html") });
  } else if (request.action == "GET_FORM_EVENTS") {
    sendResponse({ data: eventData });
  } else if (request.action == "showEnvironmentVariables") {
    variablesData = request.data;
    envVarSourceTabId = sender.tab?.id;
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/variables/variables.html") });
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
  } else if (request.action === "refreshedEnvironmentVariables") {
    variablesData = request.data;
    chrome.runtime.sendMessage({ action: "ENV_VAR_REFRESHED", data: request.data });
  } else if (request.action === "envVarSaved") {
    chrome.runtime.sendMessage({ action: "ENV_VAR_SAVED" });
  } else if (request.action === "envVarSaveError") {
    chrome.runtime.sendMessage({ action: "ENV_VAR_SAVE_ERROR", error: request.error });
  } else if (request.action == "showFormLayout") {
    formLayoutData = request.data;
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/formLayout/formLayout.html") });
  } else if (request.action == "GET_FORM_LAYOUT") {
    sendResponse({ data: formLayoutData });
  } else if (request.action == "showAuditHistory") {
    auditHistoryData = request.data;
    doneFetchingAudit = request.last;
    if (request.first) chrome.tabs.create({ url: chrome.runtime.getURL("tabs/auditHistory/auditHistory.html") });
  } else if (request.action == "GET_AUDIT_HISTORY") {
    sendResponse({ data: auditHistoryData, last: doneFetchingAudit });
  }
});

chrome.commands.onCommand.addListener(function (command) {
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
    case "show_audit_history":
      sendMessageToTab("showAuditHistory");
      break;
    default:
      break;
  }
});

function sendMessageToTab(mess) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, {
      message: mess,
    });
  });
}
