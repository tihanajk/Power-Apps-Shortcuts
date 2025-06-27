document.addEventListener("DOMContentLoaded", function () {
  getPlugins();

  search = document.querySelector("input[name=filter]");
  search.addEventListener("input", function () {
    filterResults();
  });

  var toggle = document.getElementById("expandCheck");
  toggle.addEventListener("change", function () {
    toggleTree();
  });
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
      const images = step.nextElementSibling;
      images.classList.toggle("visible");
    });
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
  initialize();
}

function renderPlugins(plugins) {
  var content = "";
  content += `<div style="margin-left:10px; margin-bottom:10px">count: ${plugins.length}</div>`;

  var tree =
    plugins &&
    plugins
      .map(
        (p) =>
          `<div class="plugin-block">
            <h2 class="plugin-title">${p?.name}</h2>
              <ul class="steps">
              ${
                p.steps.length > 0
                  ? p.steps
                      .map(
                        (s) =>
                          `<li>
                            <h3 class="step">⚡ ${s.name} ${s.status == 1 ? "🟢" : "🟡"}                
                            ${s.filter ? `<div style="margin-left:20px; overflow-wrap: break-word;">🔍 filters: ${s.filter}</div>` : ""}
                            </h3>
                            <ul class="images">
                            ${s.image.name ? `<li><h3>🖼️ image: ${s.image.name} - ${s.image.attributes}</h3></li>` : ""}
                            </ul>
                          </li>`
                      )
                      .join("")
                  : "no steps found"
              }    
              </ul>
          </div>`
      )
      .join("");

  content += tree;

  document.getElementById("tree").innerHTML = content;
}

function toggleTree() {
  var toggleOn = document.getElementById("expandCheck").checked;

  document.querySelectorAll(".plugin-title").forEach((title) => {
    const steps = title.nextElementSibling;
    if (toggleOn) {
      steps.classList.add("visible");
    } else {
      steps.classList.remove("visible");
    }
  });

  document.querySelectorAll(".step").forEach((step) => {
    const images = step.nextElementSibling;
    if (toggleOn) {
      images.classList.add("visible");
    } else {
      images.classList.remove("visible");
    }
  });
}
