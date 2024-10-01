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

    var header = false;
    Xrm.Page.ui.headerSection.controls.get().forEach((c) => {
      var attr = c?.getAttribute();
      var name = attr?.getName();

      if (name == field) header = true;
    });

    var tabs = [];
    var sections = [];

    var supportedTypes = ["standard", "lookup", "choices", "choice", "optionset"];
    Xrm.Page.ui.tabs.get().forEach((t) =>
      t.sections.get().forEach((s) =>
        s.controls.get().forEach((c) => {
          var type = c?.getControlType();
          if (supportedTypes.indexOf(type) == -1) return;

          var attr = c?.getAttribute();
          var name = attr?.getName();

          if (name == field) {
            tabs.push(`${t?.getLabel()}  (${t?.getName()})`);
            sections.push(`${s?.getLabel()}  (${s?.getName()})`);
          }
        })
      )
    );

    var message = header ? "✨ Field found in header ✨" : "";
    if (tabs && sections) {
      if (header) message += "\n";
      tabs.forEach((tab, i) => {
        var section = sections[i];
        message += `🚀 Tab: ${tab}\nSection: ${section}\n`;
      });
    }

    if (message != "") alert(message);
    else alert("⚠️ Field not found");

    located = true;
  }
}

window.addEventListener("message", function (event) {
  if (event.source === window && event.data.type === "LOCATE_ME") {
    loc();
  }
});
