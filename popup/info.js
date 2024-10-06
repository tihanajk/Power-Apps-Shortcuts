document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("open-shortcuts");
  button.addEventListener("click", function () {
    chrome.runtime.sendMessage({ action: "openShortcuts" });
  });
});
