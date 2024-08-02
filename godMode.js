// Function to enable all controls
var didGodMode = false;

function god() {
  if (didGodMode) return;

  console.log("enableAllControls called");
  if (typeof Xrm !== "undefined" && Xrm.Page) {
    const selectedTab = Xrm.Page.ui.tabs.get((x) => x.getDisplayState() === "expanded")[0];

    Xrm.Page.data.entity.attributes.forEach((a) => a.setRequiredLevel("none"));

    Xrm.Page.ui.controls.forEach((c) => {
      c.setVisible(true);
      if (c.setDisabled) {
        c.setDisabled(false);
      }
      if (c.clearNotification) {
        c.clearNotification();
      }
    });

    Xrm.Page.ui.tabs.forEach((t) => {
      t.setVisible(true);
      t.setDisplayState("expanded");
      t.sections.forEach((s) => s.setVisible(true));
    });

    if (selectedTab.setFocus) {
      selectedTab.setDisplayState("expanded");
      selectedTab.setFocus();
    }

    didGodMode = true;
  }
}

window.addEventListener("message", function (event) {
  if (event.source === window && event.data.type === "YOU_HAVE_THE_SIGHT") {
    god();
  }
});
