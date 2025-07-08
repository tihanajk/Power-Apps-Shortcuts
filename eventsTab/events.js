document.addEventListener("DOMContentLoaded", function () {
  getEventsResults();
});

function getEventsResults() {
  chrome.runtime.sendMessage(
    {
      action: "GET_FORM_EVENTS",
    },
    function (response) {
      var data = response.data;

      console.log(data);

      document.getElementById("form-name").innerHTML = data.name;

      handleLibraries(data.libraries);
      handleEvents(data.events);
    }
  );
}
function handleEvents(events) {
  var content = "<h2>Events</h2>";

  var table = `
    <div class="table-container">
    <div class="table-wrapper">
      <table id="main">                        
        <thead>
          <tr>
            <th>Name</th>
            <th>Attribute</th>
            <th>Handlers</th>
          </tr>
        </thead>
        <tbody>
          ${events
            .map(
              (e) =>
                `<tr>
            <td>${e.name}</td>
            <td>${e.attribute}</td>
            <td> ${makeMiniTable(e.handlers)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>`;

  content += table;

  document.getElementById("events-content").innerHTML = content;
}

function makeMiniTable(handlers) {
  var mini = `<table id="mini">
              <thead>
                <tr>
                  <th>Library Name</th>
                  <th>Function Name</th>
                  <th>Enabled</th>
                </tr>
              </thead>
              <tbody>
              ${handlers
                .map(
                  (v) =>
                    `<tr id="mini-row">
                      <td>${v?.libraryName}</td>
                      <td>${v?.functionName}</td>
                      <td>${v?.enabled}</td>
                  </tr>
                </tbody>`
                )
                .join("")}
            </table>`;
  return mini;
}

function handleLibraries(libraries) {
  var content = "<h2>Libraries</h2>";

  var table = `
    <div class="table-container">
    <div class="table-wrapper">
      <table id="main">                        
        <thead>
          <tr>
            <th>Name</th>
            <th>Id</th>
          </tr>
        </thead>
        <tbody>
          ${libraries.map((l) => `<tr><td>${l.name}</td><td>${l.libraryUniqueId}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  </div>`;

  content += table;

  document.getElementById("libraries-content").innerHTML = content;
}
