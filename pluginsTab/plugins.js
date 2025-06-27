document.addEventListener("DOMContentLoaded", function () {
  getPlugins();
});

var search;
var plugins = [];
function initialize() {
  document.querySelectorAll(".plugin-title").forEach((title) => {
    title.addEventListener("click", () => {
      const steps = title.nextElementSibling;
      steps.classList.toggle("visible");
    });
  });

  document.querySelectorAll(".step").forEach((step) => {
    step.addEventListener("click", () => {
      const filters = step.nextElementSibling;
      filters.classList.toggle("visible");
    });
  });

  search = document.querySelector("input[name=filter]");
  search.addEventListener("input", function () {
    filterResults();
  });
}

function getPlugins() {
  chrome.runtime.sendMessage(
    {
      action: "GET_PLUGINS",
    },
    function (response) {
      console.log(response);
      var assemblyName = response.assemblyName;

      document.getElementById("assembly-name").innerHTML = assemblyName;

      plugins = response?.plugins;

      renderPlugins(plugins);

      initialize();
    }
  );
}

function filterResults() {
  var searchFilter = search.value.toLowerCase();

  var filtered = plugins.map((p) => {
    var pluginMatch = p.name.toLowerCase().includes(searchFilter);
    if (pluginMatch) return p;

    var stepsMatch = p.steps.filter(
      (s) => (s?.name && s.name.toLowerCase().includes(searchFilter)) || (s?.filter && s.filter.toLowerCase().includes(searchFilter))
    );

    if (stepsMatch.length > 0) return { ...p, steps: stepsMatch };
  });

  filtered = filtered.filter((p) => p != null);
  renderPlugins(filtered);
}

function renderPlugins(plugins) {
  var content = "";
  content += `<div>count: ${plugins.length}</div>`;

  var tree =
    plugins &&
    plugins
      .map(
        (p) =>
          `<h2 class="plugin-title">${p?.name}</h2>
    <ul class="steps">
    ${
      p.steps.length > 0
        ? p.steps
            .map(
              (s) =>
                `<li>
            <h3 class="step">⚡ ${s.name} ${s.status == 1 ? "🟢" : "🟡"}                
            ${s.filter ? `<div style="margin-left:20px">🔍 filters: ${s.filter}</div>` : ""}
            </h3>        
        </li>`
            )
            .join("")
        : "no steps found"
    }    
    </ul>`
      )
      .join("");

  content += tree;

  document.getElementById("tree").innerHTML = content;
}
