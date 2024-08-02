// Function to enable all controls
var located = false;

function loc() {
  if (located) return;

  console.log("loc called");
  if (typeof Xrm !== "undefined" && Xrm.Page) {
    var field = prompt("Locate field by name");

    if (field == null || field == "") {
      return;
    }

    var tab = "";
    var section = "";
    Xrm.Page.ui.tabs.get().forEach((t) =>
      t.sections.get().forEach((s) =>
        s.controls.get().forEach((c) => {
          if (c.getName() == field) {
            tab = t.getName();
            section = s.getName();
          }
        })
      )
    );

    if (tab != "" && section != "") {
      alert(`Tab: ${tab}\nSection: ${section}`);
    } else {
      alert("Field not found");
    }

    located = true;
  }
}

window.addEventListener("message", function (event) {
  if (event.source === window && event.data.type === "LOCATE_ME") {
    loc();
  }
});
