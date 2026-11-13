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
      const steps = title.parentElement.querySelector(".steps");
      if (steps) steps.classList.toggle("visible");
    });
  });

  document.querySelectorAll(".step").forEach((step) => {
    step.addEventListener("click", () => {
      const images = step.parentElement.querySelector(".images");
      if (images) images.classList.toggle("visible");
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

      plugins = (response?.plugins || []).sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));

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
  var list = plugins || [];
  var content = `<div class="count">count: ${list.length}</div>`;

  var tree = list
    .map(function (p) {
      var steps = p.steps || [];
      var stepsHtml = steps.length ? steps.map(renderStep).join("") : `<li class="no-steps">No steps found</li>`;

      return `<div class="plugin-block">
            <div class="plugin-title" role="button" tabindex="0">
              <span class="plugin-chevron" aria-hidden="true">▸</span>
              <span class="plugin-name">${p?.isServiceEndpoint ? '<span class="plugin-icon" title="Service Endpoint">🔌</span>' : ""}${escapeHtml(p?.name)}</span>
              <span class="plugin-meta">${steps.length} ${steps.length === 1 ? "step" : "steps"}</span>
            </div>
            ${p?.isServiceEndpoint && p.endpointInfo ? renderEndpointInfo(p.endpointInfo) : ""}
            <ul class="steps">${stepsHtml}</ul>
          </div>`;
    })
    .join("");

  document.getElementById("tree").innerHTML = content + tree;
}

function renderStep(s) {
  var enabled = s.status == 1;
  var statusBadge = enabled
    ? `<span class="badge badge-on" title="Enabled">Enabled</span>`
    : `<span class="badge badge-off" title="Disabled">Disabled</span>`;
  var modeBadge =
    s.mode == 0
      ? `<span class="badge badge-sync" title="Synchronous">Sync</span>`
      : s.mode == 1
        ? `<span class="badge badge-async" title="Asynchronous">Async</span>`
        : "";
  var hasImage = !!(s.image && s.image.name);
  var filterHtml = s.filter
    ? `<div class="step-detail"><span class="detail-label">🔍 Filters</span><code class="detail-val">${escapeHtml(s.filter)}</code></div>`
    : "";
  var imageHtml = hasImage
    ? `<li class="image-row"><span title="Image">🖼️</span><span class="img-name">${escapeHtml(s.image.name)}</span>${s.image.attributes ? `<code class="detail-val">${escapeHtml(s.image.attributes)}</code>` : ""}</li>`
    : "";

  return `<li class="step-item${hasImage ? " has-image" : ""}">
            <div class="step" role="button" tabindex="0">
              ${hasImage ? '<span class="step-chevron" aria-hidden="true">▸</span>' : '<span class="step-bullet" title="Step" aria-hidden="true">⚡</span>'}
              <span class="step-name">${escapeHtml(s.name)}</span>
              ${statusBadge}
              ${modeBadge}
              ${filterHtml}
            </div>
            <ul class="images">${imageHtml}</ul>
          </li>`;
}

function escapeHtml(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderEndpointInfo(info) {
  var rows = [];
  if (info.url) rows.push(`<div><span title="URL">🔗</span> ${escapeHtml(info.url)}</div>`);
  if (info.contract) rows.push(`<div><span title="Contract">📄</span> ${escapeHtml(info.contract)}</div>`);
  if (info.messageformat) rows.push(`<div><span title="Message format">✉️</span> ${escapeHtml(info.messageformat)}</div>`);
  if (rows.length === 0) return "";
  return `<div class="endpoint-info">${rows.join("")}</div>`;
}

function toggleTree() {
  var toggleOn = document.getElementById("expandCheck").checked;

  document.querySelectorAll(".plugin-title").forEach((title) => {
    const steps = title.parentElement.querySelector(".steps");
    if (!steps) return;
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
