chrome.browserAction.onClicked.addListener((tab) => {
  // Send a message to the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, {
      message: "triggerGM",
    });
  });
});

chrome.commands.onCommand.addListener(function (command) {
  if (command === "_execute_browser_action") {
    // Send a message to the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      var activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, {
        message: "triggerGM",
      });
    });
  } else if (command === "ribbon_debug") {
    // Send a message to the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      var activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, {
        message: "ribbonDebug",
      });
    });
  } else if (command === "advanced_find") {
    // Send a message to the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      var activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, {
        message: "advancedFind",
      });
    });
  } else if (command === "locate_on_form") {
    // Send a message to the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      var activeTab = tabs[0];
      console.log("Sending locateOnForm message");
      chrome.tabs.sendMessage(activeTab?.id, {
        message: "locateOnForm",
      });
    });
  }
});
