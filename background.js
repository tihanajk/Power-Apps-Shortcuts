chrome.action.onClicked.addListener((tab) => {
  // Send a message to the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, {
      message: "triggerGM",
    });
  });
});

var optionsetsdata = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openShortcuts") {
    chrome.tabs.create({ url: "edge://extensions/shortcuts" });
  } else if (request.action === "showOptions") {
    optionsetsdata = request.options;
    chrome.tabs.create({ url: chrome.runtime.getURL("optionsTab/options.html") });
  } else if (request.action === "LOAD_OPTIONS") {
    sendResponse({ options: optionsetsdata });
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
