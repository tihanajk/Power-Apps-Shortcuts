document.addEventListener("DOMContentLoaded", function () {
  chrome.runtime.sendMessage(
    {
      action: "LOAD_OPTIONS",
    },
    function (response) {
      console.log(response);
      var options = response.options;
      var content = `${
        options &&
        options
          .map(
            (o) =>
              `<tr id="main">
                <td>${o?.LogicalName} ${o?.OnForm ? "🟢" : ""}</td>
                <td> ${makeMiniTable(o.Options)}</td>
              </tr>`
          )
          .join("")
      }`;

      var opt = `${options && options.map((o) => `<div id="option">${o?.LogicalName}${makeMiniTable(o.Options)}</div>`).join("")}`;

      document.getElementById("dynamic-content").innerHTML = content;
      //document.getElementById("options").innerHTML = opt;
    }
  );
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "updateContentOfOptions") {
    var options = request.options;
  }
});

function makeMiniTable(options) {
  var mini = `<table id="mini">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Value</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
              ${options
                .map(
                  (v) =>
                    `<tr id="mini-row">
                      <td>${v?.Label}</td>
                      <td>${v?.Value}</td>
                      <td>${v?.State == undefined ? "-" : v?.State}</td>
                  </tr>
                </tbody>`
                )
                .join("")}
            </table>`;
  return mini;
}
