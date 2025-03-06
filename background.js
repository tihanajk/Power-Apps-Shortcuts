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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openShortcuts") {
    chrome.tabs.create({ url: "edge://extensions/shortcuts" });
  } else if (request.action === "showOptions") {
    optionsetsData = request.options;
    chrome.tabs.create({ url: chrome.runtime.getURL("optionsTab/options.html") });
  } else if (request.action === "LOAD_OPTIONS") {
    sendResponse({ options: optionsetsData });
  } else if (request.action == "showSecurity") {
    securityData = request.roles;
    doneFetchingSecurity = request.last;
    orgId = request.orgId;
    envId = request.envId;
    if (request.first) chrome.tabs.create({ url: chrome.runtime.getURL("securityTab/security.html") });
  } else if (request.action === "GET_SECURITY") {
    sendResponse({ roles: securityData, last: doneFetchingSecurity, orgId: orgId, envId: envId });
  } else if (request.action === "showRetrieveResult") {
    fetchData = request.result;
    entityName = request.entityName;
    chrome.tabs.create({ url: chrome.runtime.getURL("fetchTab/fetch.html") });
  } else if (request.action === "GET_FETCH") {
    sendResponse({ fetchData: fetchData, fetchEntityName: entityName });
  } else if (request.action === "showAllFields") {
    allFields = request.result;
    entityName = request.entityName;
    chrome.tabs.create({ url: chrome.runtime.getURL("fieldsTab/fields.html") });
  } else if (request.action === "GET_ALL_FIELDS") {
    sendResponse({ allFields: allFields, entityName: entityName });
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
