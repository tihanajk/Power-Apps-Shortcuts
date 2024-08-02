//add listener
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.message === "triggerGM") {
    var script = document.createElement("script");
    script.type = "text/javascript";

    script.src = chrome.runtime.getURL("godMode.js");
    (document.head || document.documentElement).appendChild(script);
    script.remove();

    window.postMessage({ type: "YOU_HAVE_THE_SIGHT" }, "*");
  } else if (request.message === "ribbonDebug") {
    //tab url
    var url = location.href;

    if (url.includes("&ribbondebug=true")) {
      url = url.replace("&ribbondebug=true", "");
      //update tab url
    } else {
      //add query string
      url = url + "&ribbondebug=true";
    }
    window.location.href = url;
  } else if (request.message === "advancedFind") {
    var url = location.href.split("&pagetype")[0];
    window.open(`${url}&pagetype=advancedfind`, "_blank");
  } else if (request.message === "locateOnForm") {
    var script = document.createElement("script");
    script.type = "text/javascript";

    script.src = chrome.runtime.getURL("locate.js");
    (document.head || document.documentElement).appendChild(script);
    script.remove();

    window.postMessage({ type: "LOCATE_ME" }, "*");
  }
});
