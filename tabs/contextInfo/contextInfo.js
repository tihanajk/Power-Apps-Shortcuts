var data = null;

document.addEventListener("DOMContentLoaded", function () {
  getContextInfo();

  var search = document.querySelector("input[name=filter]");
  if (search) {
    search.addEventListener("input", function () {
      filterRows(search.value.toLowerCase());
    });
  }

  document.getElementById("downloadBtn").addEventListener("click", downloadData);

  // Click a row to copy its value to the clipboard.
  document.getElementById("info-content").addEventListener("click", function (e) {
    var row = e.target.closest(".info-row");
    if (!row || row.getAttribute("data-copy") == null) return;
    if (e.target.tagName === "A") return;
    var value = row.getAttribute("data-copy");
    if (value === "") return;
    copyText(value);
    var hint = row.querySelector(".copy-hint");
    if (hint) {
      hint.textContent = "copied";
      setTimeout(() => (hint.textContent = ""), 1200);
    }
  });
});

// Clipboard API is blocked inside the in-page modal iframe, so fall back to execCommand.
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(function () {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  var ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.top = "-1000px";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand("copy");
  } catch (e) {}
  ta.remove();
}

function getContextInfo() {
  chrome.runtime.sendMessage({ action: "GET_CONTEXT_INFO" }, function (response) {
    data = response && response.data;
    render(data);
  });
}

function escapeHtml(value) {
  if (value == null) return "";
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function rowHtml(label, value, opts) {
  opts = opts || {};
  var copy = value == null ? "" : String(value);
  var shown = copy === "" ? "—" : copy;
  var display = opts.link && shown !== "—" ? `<a href="${escapeHtml(copy)}" target="_blank">${escapeHtml(shown)}</a>` : escapeHtml(shown);
  return `<div class="info-row" data-copy="${escapeHtml(copy)}"><span class="info-label">${escapeHtml(
    label,
  )}</span><span class="info-value">${display}</span><span class="copy-hint"></span></div>`;
}

function sectionHtml(title, rows) {
  return `<div class="info-section"><h2>${escapeHtml(title)}</h2>${rows.join("")}</div>`;
}

function listSectionHtml(title, items) {
  var head = `<h2>${escapeHtml(title)}${items && items.length ? ` <span class="sec-count">${items.length}</span>` : ""}</h2>`;
  if (!items || !items.length) {
    return `<div class="info-section">${head}<div class="info-empty">None</div></div>`;
  }
  var lis = items.map((i) => `<li class="info-list-item">${escapeHtml(i)}</li>`).join("");
  return `<div class="info-section">${head}<ul class="info-list">${lis}</ul></div>`;
}

function render(d) {
  var content = document.getElementById("info-content");
  if (!d) {
    content.innerHTML = "<div class='info-empty'>No data</div>";
    return;
  }

  var general = "";
  general += sectionHtml("App", [
    rowHtml("App name", d.app.name),
    rowHtml("App id", d.app.appId),
    rowHtml("Unique name", d.app.uniqueName),
    rowHtml("App URL", d.app.url, { link: true }),
  ]);

  general += sectionHtml("Environment", [
    rowHtml("Org URL", d.environment.orgUrl, { link: true }),
    rowHtml("Org unique name", d.environment.orgUniqueName),
    rowHtml("Organization id", d.environment.organizationId),
    rowHtml("Environment id", d.environment.environmentId),
    rowHtml("Tenant id", d.environment.tenantId),
    rowHtml("Geo", d.environment.geo),
    rowHtml("Base language (LCID)", d.environment.baseLanguageId),
    rowHtml("Base currency id", d.environment.baseCurrencyId),
    rowHtml("Auto-save enabled", d.environment.autoSaveEnabled === "" ? "" : d.environment.autoSaveEnabled ? "Yes" : "No"),
    rowHtml("Dataverse version", d.environment.version),
  ]);

  general += sectionHtml("User", [
    rowHtml("Name", d.user.name),
    rowHtml("User id", d.user.userId),
    rowHtml("Email", d.user.email),
    rowHtml("Domain name", d.user.domainName),
    rowHtml("Business unit id", d.user.businessUnitId),
    rowHtml("Language (LCID)", d.user.languageId),
    rowHtml("Security roles", (d.user.roles || []).join(", ")),
  ]);

  var html = general;

  if (d.form) {
    var record = sectionHtml("Form & record", [
      rowHtml("Table", d.form.entityName),
      rowHtml("Record id", d.form.recordId),
      rowHtml("Primary name", d.form.primaryName),
      rowHtml("Record URL", d.form.recordUrl, { link: true }),
      rowHtml("Status", d.form.status),
      rowHtml("Status reason", d.form.statusReason),
      rowHtml("Owner", d.form.owner),
      rowHtml("Created on", d.form.createdOn),
      rowHtml("Created by", d.form.createdBy),
      rowHtml("Modified on", d.form.modifiedOn),
      rowHtml("Modified by", d.form.modifiedBy),
      rowHtml("Entity set", d.form.entitySetName),
      rowHtml("Object type code", d.form.objectTypeCode),
      rowHtml("Primary id attribute", d.form.primaryIdAttribute),
      rowHtml("Primary name attribute", d.form.primaryNameAttribute),
      rowHtml("Form type", d.form.formType),
      rowHtml("Form name", d.form.formName),
      rowHtml("Form id", d.form.formId),
      rowHtml("Business process", d.form.processName),
      rowHtml("Active stage", d.form.activeStage),
      rowHtml("Unsaved changes", d.form.isDirty ? "Yes" : "No"),
      rowHtml("Tabs / sections / controls", `${d.form.tabCount} / ${d.form.sectionCount} / ${d.form.controlCount}`),
    ]);

    var t = d.form.table || {};
    record += sectionHtml("Table metadata", [
      rowHtml("Display name", t.displayName),
      rowHtml("Schema name", t.schemaName),
      rowHtml("Description", t.description),
      rowHtml("Ownership", t.ownershipType),
      rowHtml("Custom table", t.isCustom === "" ? "" : t.isCustom ? "Yes" : "No"),
      rowHtml("Managed", t.isManaged === "" ? "" : t.isManaged ? "Yes" : "No"),
      rowHtml("Activity table", t.isActivity === "" ? "" : t.isActivity ? "Yes" : "No"),
      rowHtml("Audit enabled", t.auditEnabled == null || t.auditEnabled === "" ? "" : t.auditEnabled ? "Yes" : "No"),
      rowHtml("Has notes", t.hasNotes == null || t.hasNotes === "" ? "" : t.hasNotes ? "Yes" : "No"),
      rowHtml("Has activities", t.hasActivities == null || t.hasActivities === "" ? "" : t.hasActivities ? "Yes" : "No"),
    ]);

    var rel = d.form.relationships || { oneToMany: [], manyToOne: [], manyToMany: [] };
    var schema = "";
    schema += listSectionHtml(
      "Business process flows",
      (d.form.businessProcessFlows || []).map((b) => b.name + (b.active ? "  (active)" : "  (draft)")),
    );
    schema += listSectionHtml(
      "Views",
      (d.form.views || []).map((v) => `${v.name} — ${v.type}`),
    );
    schema += listSectionHtml(
      "Relationships (N:1)",
      (rel.manyToOne || []).map((r) => `${r.schema} → ${r.related}`),
    );
    schema += listSectionHtml(
      "Relationships (1:N)",
      (rel.oneToMany || []).map((r) => `${r.schema} → ${r.related}`),
    );
    schema += listSectionHtml(
      "Relationships (N:N)",
      (rel.manyToMany || []).map((r) => `${r.schema} ↔ ${r.related}`),
    );
    schema += listSectionHtml("Related tables", d.form.relatedTables || []);

    html += record + schema;
  } else {
    html += sectionHtml("Form & record", ['<div class="info-empty">Not on a record form.</div>']);
  }

  content.innerHTML = `<div class="info-grid">${html}</div>`;
}

function filterRows(term) {
  document.querySelectorAll(".info-section").forEach(function (section) {
    var any = false;
    section.querySelectorAll(".info-row, .info-list-item").forEach(function (el) {
      var match = el.innerText.toLowerCase().includes(term);
      el.style.display = match ? "" : "none";
      if (match) any = true;
    });
    section.style.display = any || !term ? "" : "none";
  });
}

function downloadData() {
  if (!data) return;
  var rows = [];
  function push(section, obj) {
    if (!obj) return;
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      // Lists of objects / nested objects are exported separately below.
      if (v && typeof v === "object" && !Array.isArray(v)) return;
      if (Array.isArray(v) && v.some((x) => x && typeof x === "object")) return;
      rows.push({ Section: section, Property: k, Value: v == null ? "" : Array.isArray(v) ? v.join(", ") : String(v) });
    });
  }
  push("App", data.app);
  push("Environment", data.environment);
  push("User", data.user);
  push("Form & record", data.form);

  if (data.form) {
    push("Table metadata", data.form.table);
    (data.form.businessProcessFlows || []).forEach((b) =>
      rows.push({ Section: "Business process flows", Property: b.name, Value: b.active ? "Active" : "Draft" }),
    );
    (data.form.views || []).forEach((v) => rows.push({ Section: "Views", Property: v.name, Value: v.type }));
    var rel = data.form.relationships || {};
    (rel.manyToOne || []).forEach((r) => rows.push({ Section: "Relationships", Property: "N:1 " + r.schema, Value: r.related }));
    (rel.oneToMany || []).forEach((r) => rows.push({ Section: "Relationships", Property: "1:N " + r.schema, Value: r.related }));
    (rel.manyToMany || []).forEach((r) => rows.push({ Section: "Relationships", Property: "N:N " + r.schema, Value: r.related }));
  }

  var ws = XLSX.utils.json_to_sheet(rows);
  var workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, "Context");
  XLSX.writeFile(workbook, "context_info.xlsx");
}
