chrome.action.onClicked.addListener((tab) => {
  // Send a message to the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, {
      message: "triggerGM",
    });
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openShortcuts") {
    chrome.tabs.create({ url: "edge://extensions/shortcuts" });
  } else if (request.action === "showOptions") {
    var options = request.options;
    chrome.tabs.create(
      { url: chrome.runtime.getURL("optionsTab/options.html") },
      (tab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          if (tabId === tab.id && changeInfo.status === "complete") {
            chrome.tabs.sendMessage(tabId, {
              action: "updateContentOfOptions",
              options: options,
            });
            chrome.tabs.onUpdated.removeListener(listener);
          }
        });
      }
    );
  }
});

chrome.commands.onCommand.addListener(function (command) {
  switch (command) {
    case "god_mode":
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        var activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, {
          message: "triggerGM",
        });
      });
      break;
    case "ribbon_debug":
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        var activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, {
          message: "ribbonDebug",
        });
      });
      break;
    case "advanced_find":
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        var activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, {
          message: "advancedFind",
        });
      });
      break;
    case "locate_on_form":
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        var activeTab = tabs[0];
        console.log("Sending locateOnForm message");
        chrome.tabs.sendMessage(activeTab?.id, {
          message: "locateOnForm",
        });
      });
      break;
    case "open_list":
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        var activeTab = tabs[0];
        console.log("Sending openList message");
        chrome.tabs.sendMessage(activeTab?.id, {
          message: "openList",
        });
      });
      break;
    case "open_record":
      sendMessageToTab("openRecord");
      break;
    case "see_optionsets":
      sendMessageToTab("seeOptions");
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
