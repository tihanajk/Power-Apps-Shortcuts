var allOptions = [];

document.addEventListener("DOMContentLoaded", function () {
  chrome.runtime.sendMessage(
    {
      action: "LOAD_OPTIONS",
    },
    function (response) {
      console.log(response);
      allOptions = response.options;

      renderTable(allOptions);
    }
  );
});

function renderTable(options) {
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

  document.getElementById("dynamic-content").innerHTML = content;
  document.getElementById("options-count").innerHTML = "count:" + options.length;
}

var checkbox = document.querySelector("input[name=formOnly]");

checkbox.addEventListener("change", function () {
  if (this.checked) {
    var formOnly = allOptions.filter((o) => o.OnForm);
    renderTable(formOnly);
  } else {
    renderTable(allOptions);
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
