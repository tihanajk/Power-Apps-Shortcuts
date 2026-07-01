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

  document.getElementById("downloadBtn").addEventListener("click", () => downloadData());
});

var search;
var plugins = [];

function downloadData() {
  var rows = [["Plugin", "Step", "Mode", "Status", "Filters", "Image", "Image Attributes"]];

  (plugins || []).forEach((p) => {
    if (!p.steps || p.steps.length === 0) {
      rows.push([p.name, "(no steps)", "", "", "", "", ""]);
      return;
    }

    p.steps.forEach((s) => {
      var mode = s.mode == 0 ? "Synchronous" : s.mode == 1 ? "Asynchronous" : s.mode;
      var status = s.status == 1 ? "Enabled" : "Disabled";
      rows.push([p.name, s.name, mode, status, s.filter || "", s.image?.name || "", s.image?.attributes || ""]);
    });
  });

  var ws = XLSX.utils.aoa_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Plugin Steps");
  XLSX.writeFile(wb, "plugin_steps.xlsx");
}

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
      var assemblyName = response.assemblyName;

      document.getElementById("assembly-name").innerHTML = assemblyName;

      plugins = response?.plugins;

      renderPlugins(plugins);

      initialize();
    },
  );
}

function filterResults() {
  var searchFilter = search.value.toLowerCase();

  var filtered = plugins.map((p) => {
    var pluginMatch = p.name.toLowerCase().includes(searchFilter);
    if (pluginMatch) return p;

    var stepsMatch = p.steps.filter(
      (s) => (s?.name && s.name.toLowerCase().includes(searchFilter)) || (s?.filter && s.filter.toLowerCase().includes(searchFilter)),
    );

    if (stepsMatch.length > 0) return { ...p, steps: stepsMatch };
  });

  filtered = filtered.filter((p) => p != null);
  renderPlugins(filtered);
  initialize();
}

function renderPlugins(plugins) {
  var content = "";
  content += `<div class="count" style="margin-left:10px">count: ${plugins.length}</div>`;

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
                            ${s.mode == 0 ? '<div style="margin-left:10px; overflow-wrap: break-word;" >🔀 Synchronous</div>' : s.mode == 1 ? '<div style="margin-left:10px; overflow-wrap: break-word;">⏱️ Asynchronous</div>' : s.mode}            
                            ${s.filter ? `<div style="margin-left:20px; margin-top:10px; overflow-wrap: break-word;">🔍 filters: ${s.filter}</div>` : ""}
                            </h3>
                            <ul class="images">
                            ${s.image.name ? `<li><h3>🖼️ image: ${s.image.name} - ${s.image.attributes}</h3></li>` : ""}
                            </ul>
                          </li>`,
                      )
                      .join("")
                  : "no steps found"
              }    
              </ul>
          </div>`,
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
