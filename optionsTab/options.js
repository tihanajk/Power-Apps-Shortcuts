var allOptions = [];
var checkboxForm;
var checkboxMulti;
var checkboxBool;

document.addEventListener("DOMContentLoaded", function () {
  chrome.runtime.sendMessage(
    {
      action: "LOAD_OPTIONS",
    },
    function (response) {
      allOptions = response.options;

      renderTable(allOptions);
    }
  );

  checkboxForm = document.querySelector("input[name=formOnly]");
  checkboxForm.addEventListener("change", function () {
    filterTable();
  });

  checkboxMulti = document.querySelector("input[name=multiOnly]");
  checkboxMulti.addEventListener("change", function () {
    filterTable();
  });

  checkboxBool = document.querySelector("input[name=boolOnly]");
  checkboxBool.addEventListener("change", function () {
    filterTable();
  });
});

function renderTable(options) {
  var content = `${
    options &&
    options
      .map(
        (o) =>
          `<tr id="main">
            <td>${o?.Multi ? "Ⓜ️ " : ""}${o?.Bool ? "🅱️ " : ""}${o?.LogicalName}${o?.OnForm ? " 🟢" : ""}</td>
            <td> ${makeMiniTable(o.Options)}</td>
          </tr>`
      )
      .join("")
  }`;

  document.getElementById("dynamic-content").innerHTML = content;
  document.getElementById("options-count").innerHTML = "count:" + options.length;
}

function filterTable() {
  var formOnly = checkboxForm.checked;
  var multiOnly = checkboxMulti.checked;
  var boolOnly = checkboxBool.checked;

  var filtered = allOptions.filter((o) => (!formOnly || o.OnForm) && (!multiOnly || o.Multi) && (!boolOnly || o.Bool));

  renderTable(filtered);
}

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
