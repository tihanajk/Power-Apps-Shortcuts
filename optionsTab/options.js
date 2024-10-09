chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "updateContentOfOptions") {
    var options = request.options;

    var content = `${
      options &&
      options
        .map(
          (o) =>
            `<tr id="main">
            <td >${o?.LogicalName}</td>
             <td> ${makeMiniTable(o.Options)}</td>
            </tr>`
        )
        .join("")
    }`;

    document.getElementById("dynamic-content").innerHTML = content;
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
                      <td style="width:10%">${v?.State == undefined ? "-" : v?.State}</td>
                  </tr>
                </tbody>`
                )
                .join("")}
            </table>`;
  return mini;
}
