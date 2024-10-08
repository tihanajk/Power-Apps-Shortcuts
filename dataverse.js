var didOptionsRetrieve = false;

function getOptions() {
  if (didOptionsRetrieve) return;

  var options = [
    {
      name: "color",
      values: [
        { displayName: "red", value: 1, state: null },
        { displayName: "green", value: 2, state: null },
        { displayName: "blue", value: 3, state: null },
      ],
    },
    {
      name: "status",
      values: [
        { displayName: "enabled", value: 1, state: "active" },
        { displayName: "disabled", value: 2, state: "inactive" },
        { displayName: "unknown", value: 3, state: "active" },
      ],
    },
    {
      name: "state",
      values: [
        { displayName: "active", value: 0, state: null },
        { displayName: "inactive", value: 1, state: null },
      ],
    },
  ];

  didOptionsRetrieve = true;

  chrome.runtime.sendMessage({
    action: "showOptions",
    options: options,
  });
}

window.addEventListener("message", function (event) {
  if (event.source === window && event.data.type === "SHOW_OPTIONS") {
    getOptions();
  }
});
