var state = {
  entityName: "",
  url: "",
  page: 1,
  hasMore: false,
  paged: false,
  navigating: false,
};

document.addEventListener("DOMContentLoaded", function () {
  getFetchResults();

  var search = document.querySelector("input[name=filter]");
  if (search) {
    search.addEventListener("input", function () {
      filterResults(search.value.toLowerCase());
    });
  }

  // Content is re-rendered on each page, so delegate the row click once.
  document.getElementById("fetch-content").addEventListener("click", function (e) {
    var row = e.target.closest("tr.clickable");
    if (!row) return;
    var recordUrl = row.getAttribute("data-url");
    if (recordUrl) window.open(recordUrl, "_blank");
  });

  document.getElementById("prevPage").addEventListener("click", function () {
    if (state.page > 1) goToPage(state.page - 1);
  });
  document.getElementById("nextPage").addEventListener("click", function () {
    if (state.hasMore) goToPage(state.page + 1);
  });

  var pageInput = document.getElementById("pageInput");
  pageInput.addEventListener("change", jumpToInputPage);
  pageInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") jumpToInputPage();
  });
});

function jumpToInputPage() {
  var target = parseInt(document.getElementById("pageInput").value, 10);
  if (!target || target < 1) target = 1;
  if (target === state.page) return;
  goToPage(target);
}

// Fetches the next/previous 5000-row page on demand from the source Dataverse tab.
function goToPage(page) {
  if (state.navigating) return;
  state.navigating = true;
  updatePager();
  renderLoading(state.entityName);
  chrome.runtime.sendMessage({ action: "REQUEST_FETCH_PAGE", page: page });
}

function filterResults(term) {
  var table = document.getElementById("main");
  if (!table) return;

  var rows = table.querySelectorAll("tbody tr");
  rows.forEach(function (row) {
    var text = row.innerText.toLowerCase();
    row.style.display = !term || text.includes(term) ? "" : "none";
  });
}

function getFetchResults() {
  chrome.runtime.sendMessage(
    {
      action: "GET_FETCH",
    },
    function (response) {
      applyData(response);
    },
  );

  document.getElementById("downloadBtn").addEventListener("click", () => downloadData());
}

// Results arrive after the tab has already opened in a loading state.
chrome.runtime.onMessage.addListener(function (request) {
  if (request.action === "FETCH_READY") {
    applyData({
      fetchData: request.data.result,
      fetchEntityName: request.data.entityName,
      url: request.data.url,
      page: request.data.page,
      hasMore: request.data.hasMore,
      paged: request.data.paged,
      loading: false,
    });
  } else if (request.action === "FETCH_PAGE_READY") {
    state.navigating = false;
    if (request.data.error) {
      renderLoading(state.entityName);
      document.getElementById("fetch-content").innerHTML = `<div>⚠️ ${request.data.error}</div>`;
      updatePager();
      return;
    }
    state.page = request.data.page;
    state.hasMore = request.data.hasMore === true;
    renderPage(request.data.result);
  }
});

function applyData(response) {
  if (!response) return;

  if (response.loading) {
    renderLoading(response.fetchEntityName);
    return;
  }

  state.entityName = response.fetchEntityName || state.entityName;
  state.url = response.url || state.url;
  state.page = response.page || 1;
  state.hasMore = response.hasMore === true;
  state.paged = response.paged === true;
  state.navigating = false;

  renderPage(response.fetchData);
}

function renderPage(fetchData) {
  var hasRows = fetchData.entities.length > 0;
  document.getElementById("count-row").style.display = hasRows ? "flex" : "none";
  document.getElementById("count").textContent = "count: " + fetchData.entities.length;
  document.getElementById("fetch-content").innerHTML = renderResults(fetchData, state.entityName, state.url);
  updatePager();
}

function updatePager() {
  var pager = document.getElementById("pager");
  // Only show paging controls when there is actually more than one page.
  var needed = state.paged && (state.hasMore || state.page > 1);
  pager.style.display = needed ? "flex" : "none";
  if (!needed) return;

  var pageInput = document.getElementById("pageInput");
  if (document.activeElement !== pageInput) pageInput.value = state.page;
  pageInput.disabled = state.navigating;
  document.getElementById("prevPage").disabled = state.navigating || state.page <= 1;
  document.getElementById("nextPage").disabled = state.navigating || !state.hasMore;
}

function renderLoading(entityName) {
  if (entityName) {
    document.getElementById("title").innerHTML = `Fetched data for entity ${entityName.toUpperCase()}`;
  }
  document.getElementById("fetch-content").innerHTML = '<div class="loading"><div class="spinner"></div><span>Retrieving records…</span></div>';
}

function downloadData() {
  var table = document.getElementById("main");

  var sheetName = document.getElementById("title").innerHTML;
  const workbook = XLSX.utils.table_to_book(table, { sheet: sheetName });
  XLSX.writeFile(workbook, `fetchresults.xlsx`);
}

function renderResults(fetchData, entityName, url) {
  document.getElementById("title").innerHTML = `Fetched data for entity ${entityName.toUpperCase()}`;

  if (fetchData.entities.length == 0) {
    return "<div>No data</div>";
  }

  var first = fetchData.entities[0];
  var columns = ["_"];
  for (const [key, value] of Object.entries(first)) {
    if (key == "@odata.etag") continue;
    columns.push(key);
  }

  var primaryIdField = entityName + "id";

  function getRecordId(r) {
    if (r[primaryIdField]) return r[primaryIdField];
    var guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const [key, value] of Object.entries(r)) {
      if (key.endsWith("id") && typeof value === "string" && guidRegex.test(value)) return value;
    }
    return null;
  }

  var table = `
  <div class="table-container">
    <div class="table-wrapper">
      <table id="main">                        
          <thead>
            <tr>
            ${columns.map((c) => `<th>${c}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
          ${fetchData.entities
            .map((r) => {
              var recordId = getRecordId(r);
              var recordUrl = url && recordId ? `${url}/main.aspx?pagetype=entityrecord&etn=${entityName}&id=${recordId}` : "";
              return `<tr id="main-row"${recordUrl ? ` class="clickable" data-url="${recordUrl}"` : ""}>${columns
                .map((c) => (c == "_" ? `<td>${fetchData.entities.indexOf(r) + 1}</td>` : `<td>${r[c]}</td>`))
                .join("")}</tr>`;
            })
            .join("")}
          </tbody>
      </table>
    </div>
  </div>`;

  return table;
}
