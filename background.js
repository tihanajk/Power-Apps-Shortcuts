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
var fetchEntityName = "";

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
    if (request.first) chrome.tabs.create({ url: chrome.runtime.getURL("securityTab/security.html") });
  } else if (request.action === "GET_SECURITY") {
    sendResponse({ roles: securityData, last: doneFetchingSecurity });
  } else if (request.action === "showRetrieveResult") {
    fetchData = request.result;
    fetchEntityName = request.entityName;
    chrome.tabs.create({ url: chrome.runtime.getURL("fetchTab/fetch.html") });
  } else if (request.action === "GET_FETCH") {
    sendResponse({ fetchData: fetchData, fetchEntityName: fetchEntityName });
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
