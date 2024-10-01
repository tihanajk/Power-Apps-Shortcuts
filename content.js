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
  }
});

function executeInScript(message, scriptName) {
  var script = document.createElement("script");
  script.type = "text/javascript";

  script.src = chrome.runtime.getURL(scriptName);
  document.head.appendChild(script);

  script.onload = function () {
    window.postMessage({ type: message }, "*");
  };

  script.remove();
}
