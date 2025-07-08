var search;

var libraries = [];
var events = [];

document.addEventListener("DOMContentLoaded", function () {
  getEventsResults();
  search = document.querySelector("input[name=filter]");
  search.addEventListener("input", function () {
    filterData();
  });
});

function filterData() {
  var searchTerm = search.value.toLowerCase();

  var filteredLibraries = [];

  for (var item of libraries) {
    for (var key in item) {
      var value = item[key]?.toLowerCase();
      if (value?.includes(searchTerm)) {
        filteredLibraries.push(item);
        break;
      }
    }
  }

  handleLibraries(filteredLibraries);

  var filteredEvents = [];

  for (var item of events) {
    for (var key in item) {
      if (key == "handlers") {
        var handlers = item[key];
        var found = false;

        var handlerItems = [];
        for (var handler of handlers) {
          for (var k in handler) {
            var value = handler[k]?.toLowerCase();
            if (value.includes(searchTerm)) {
              handlerItems.push(handler);
              if (!found) found = true;
              break;
            }
          }
        }

        if (found) {
          item["handlers"] = handlerItems;
          filteredEvents.push(item);
          break;
        }
      } else {
        var value = item[key]?.toLowerCase();
        if (value?.includes(searchTerm)) {
          filteredEvents.push(item);
          break;
        }
      }
    }
  }

  handleEvents(filteredEvents);
}

function getEventsResults() {
  chrome.runtime.sendMessage(
    {
      action: "GET_FORM_EVENTS",
    },
    function (response) {
      var data = response.data;

      console.log(data);

      document.getElementById("form-name").innerHTML = data.name;

      libraries = data.libraries;
      events = data.events;

      handleLibraries(libraries);
      handleEvents(events);
    }
  );
}
function handleEvents(events) {
  var content = "<h2>Events</h2>";

  if (events.length == 0) content += "No data";
  else {
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
            <td>${e.attribute ?? ""}</td>
            <td> ${makeMiniTable(e.handlers)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>`;

    content += table;
  }
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

  if (libraries.length == 0) content += "No data";
  else {
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
  }

  document.getElementById("libraries-content").innerHTML = content;
}
