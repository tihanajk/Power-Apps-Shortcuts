function god() {
  if (typeof Xrm !== "undefined" && Xrm.Page) {
    const selectedTab = Xrm.Page.ui.tabs.get((x) => x.getDisplayState() === "expanded")[0];

    Xrm.Page.data.entity.attributes.forEach((a) => a.setRequiredLevel("none"));

    Xrm.Page.ui.controls.forEach((c) => {
      c.setVisible(true);
      if (c.setDisabled) {
        c.setDisabled(false);
      }
      if (c.clearNotification) {
        c.clearNotification();
      }
    });

    Xrm.Page.ui.tabs.forEach((t) => {
      t.setVisible(true);
      t.setDisplayState("expanded");
      t.sections.forEach((s) => s.setVisible(true));
    });

    if (selectedTab.setFocus) {
      selectedTab.setDisplayState("expanded");
      selectedTab.setFocus();
    }
  }
}

function showDirtyFields() {
  if (typeof Xrm === "undefined" || !Xrm.Page) return;

  var dirty = Xrm.Page.data.entity.attributes.get(function (a) {
    return a.getIsDirty();
  });

  if (!dirty || dirty.length === 0) {
    paModal.alert("✨  No unsaved changes on this record");
    return;
  }

  var lines = dirty.map(function (a) {
    var value = a.getValue();

    // Lookups return arrays of { id, name, entityType }
    if (Array.isArray(value)) {
      value = value.map((v) => (v && v.name != null ? v.name : v && v.id != null ? v.id : v)).join(", ");
    } else if (value && typeof value === "object") {
      value = value.name != null ? value.name : JSON.stringify(value);
    }

    var display = value === null || value === "" ? "(empty)" : value;
    return { name: a.getName(), value: String(display) };
  });

  var divider = "─".repeat(38);
  var title = `📝  ${dirty.length} UNSAVED FIELD${dirty.length > 1 ? "S" : ""}`;

  var body = lines.map((l) => `  • ${l.name}  →  ${l.value}`).join("\n");

  paModal.alert(`${title}\n${divider}\n${body}`);
}

function copyGuid() {
  if (typeof Xrm === "undefined" || !Xrm.Page || !Xrm.Page.data || !Xrm.Page.data.entity) {
    paModal.alert("⚠️ No record found to copy the GUID from");
    return;
  }

  var id = Xrm.Page.data.entity.getId();
  if (!id) {
    paModal.alert("⚠️ No record found to copy the GUID from");
    return;
  }

  var guid = id.replace(/[{}]/g, "");
  navigator.clipboard.writeText(guid);
  paModal.alert("copied " + guid + " to clipboard");
}

function openMaker() {
  if (typeof Xrm === "undefined") {
    paModal.alert("⚠️ Could not determine the current environment");
    return;
  }

  var envId = Xrm.Utility.getGlobalContext().organizationSettings.bapEnvironmentId;
  if (!envId) {
    paModal.alert("⚠️ Could not determine the current environment");
    return;
  }

  window.open(`https://make.powerapps.com/environments/${envId}/home`, "_blank");
}

function openAdminCenter() {
  if (typeof Xrm === "undefined") {
    paModal.alert("⚠️ Could not determine the current environment");
    return;
  }

  var envId = Xrm.Utility.getGlobalContext().organizationSettings.bapEnvironmentId;
  if (!envId) {
    paModal.alert("⚠️ Could not determine the current environment");
    return;
  }

  window.open(`https://admin.powerplatform.microsoft.com/environments/environment/${envId}/hub`, "_blank");
}

async function openSolution() {
  if (typeof Xrm === "undefined") {
    paModal.alert("⚠️ Could not determine the current environment");
    return;
  }

  var envId = Xrm.Utility.getGlobalContext().organizationSettings.bapEnvironmentId;
  if (!envId) {
    paModal.alert("⚠️ Could not determine the current environment");
    return;
  }

  var solutions = [];
  try {
    var solRes = await Xrm.WebApi.retrieveMultipleRecords(
      "solution",
      "?$select=solutionid,uniquename,friendlyname&$filter=isvisible eq true and uniquename ne 'Default'&$orderby=friendlyname asc",
    );
    solRes.entities.forEach((s) => {
      if (s.solutionid) solutions.push({ id: s.solutionid, unique: s.uniquename, friendly: s.friendlyname });
    });
  } catch (e) {
    paModal.alert("Error loading solutions: " + e.message);
    return;
  }

  if (solutions.length == 0) {
    paModal.alert("No solutions found");
    return;
  }

  var solutionOptions = solutions.map((s) => ({ value: s.id, label: s.friendly ? `${s.friendly} (${s.unique})` : s.unique }));

  var res = await paModal.form("Open solution in Power Apps", [
    {
      name: "solution",
      label: "Solution",
      type: "combobox",
      options: solutionOptions,
      defaultValue: solutionOptions[0].value,
      placeholder: "Type to search...",
    },
  ]);
  if (res == null) return;

  var solutionId = res.solution;
  if (!solutionId) return;

  window.open(`https://make.powerapps.com/environments/${envId}/solutions/${solutionId}`, "_blank");
}

async function loc() {
  if (typeof Xrm !== "undefined" && Xrm.Page) {
    var field = await paModal.prompt("Locate field by name");

    if (field == null || field == "") {
      return;
    }

    var header = false;
    Xrm.Page.ui.headerSection.controls.get().forEach((c) => {
      var attr = c?.getAttribute();
      var name = attr?.getName();

      if (name == field) header = true;
    });

    var tabs = [];
    var sections = [];

    Xrm.Page.ui.tabs.get().forEach((t) =>
      t.sections.get().forEach((s) =>
        s.controls.get().forEach((c) => {
          if (typeof c.getAttribute != "function" || c.getControlType() == "formcomponent") return;

          var attr = c?.getAttribute();

          var name = attr?.getName();

          if (name == field) {
            tabs.push(`${t?.getLabel()}  (${t?.getName()})`);
            sections.push(`${s?.getLabel()}  (${s?.getName()})`);
          }
        }),
      ),
    );

    var message = header ? "✨ Field found in header ✨" : "";
    if (tabs && sections) {
      if (header) message += "\n";
      tabs.forEach((tab, i) => {
        var section = sections[i];
        message += `🚀 Tab: ${tab}\nSection: ${section}\n`;
      });
    }

    if (message != "") paModal.alert(message);
    else paModal.alert("⚠️ Field not found");
  }
}

async function getOptions() {
  var options = [];
  if (typeof Xrm !== "undefined" && Xrm.Page) {
    var url = Xrm.Page.context.getClientUrl();
    var entityName = Xrm.Page.data.entity.getEntityName();
    options = await getOptionSetsMetadata(url, entityName);

    window.postMessage(
      {
        type: "GIVE_ME_OPTIONS",
        options: options,
      },
      "*",
    );
  }
}

const header = {
  "OData-MaxVersion": "4.0",
  "OData-Version": "4.0",
  "Content-Type": "application/json; charset=utf-8",
  Accept: "application/json",
  Prefer: "odata.include-annotations=*",
};

async function getOptionSetsMetadata(url, entityName) {
  var base = url + `/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes/`;

  var endpoints = [
    `Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName,DefaultFormValue&$expand=OptionSet($select=Options),GlobalOptionSet($select=Options)`,
    `Microsoft.Dynamics.CRM.StatusAttributeMetadata?$select=LogicalName,DefaultFormValue&$expand=OptionSet($select=Options)`,
    `Microsoft.Dynamics.CRM.StateAttributeMetadata?$select=LogicalName,DefaultFormValue&$expand=OptionSet($select=Options)`,
    `Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata?$select=LogicalName,DefaultFormValue&$expand=OptionSet($select=Options),GlobalOptionSet($select=Options)`,
    //BOOLEAN
    `Microsoft.Dynamics.CRM.BooleanAttributeMetadata?$select=LogicalName,DefaultValue&$expand=OptionSet($select=TrueOption,FalseOption)`,
  ];

  var [resp, resp2, resp3, resp4, resp5] = await Promise.all(
    endpoints.map((e) => fetch(base + e, { method: "GET", headers: header }).then((r) => r.json())),
  );

  resp5.value = resp5.value.map((r) => {
    return { ...r, Bool: true };
  });

  resp4.value = resp4.value.map((r) => {
    return { ...r, Multi: true };
  });

  var allOptionsets = resp.value
    .concat(resp2.value)
    .concat(resp3.value)
    .concat(resp4.value)
    .concat(resp5.value)
    .sort((a, b) => (a.LogicalName > b.LogicalName ? 1 : -1));

  var formControls = Xrm.Page.ui.controls.get();
  formControls = formControls.filter((c) => c.getControlType() == "optionset").map((c) => c.getAttribute().getName());

  var data = [];
  allOptionsets.forEach((optionSet) => {
    try {
      var options = optionSet.OptionSet.Options ? optionSet.OptionSet.Options : [optionSet.OptionSet.FalseOption, optionSet.OptionSet.TrueOption];
      var ops = [];
      options.forEach((o) => {
        var op = {
          Value: o.Value,
          Label: o.Label.LocalizedLabels[0].Label,
          State: o?.State,
        };
        ops.push(op);
      });

      var logName = optionSet.LogicalName;

      var obj = {};
      obj.LogicalName = logName;
      obj.DefaultValue = optionSet.DefaultFormValue;
      obj.Options = ops;
      obj.OnForm = Xrm.Page.getAttribute(logName) != null;
      obj.Multi = optionSet.Multi;
      obj.Bool = optionSet.Bool;
      data.push(obj);
    } catch (e) {}
  });

  return data;
}

async function getTeamSecurityRoles(userId) {
  var originalFetchXML = `<fetch>
                            <entity name="role">
                              <attribute name="name" />
                              <attribute name="roleid" />
                              <link-entity name="teamroles" from="roleid" to="roleid" alias="tr" intersect="true">
                                <link-entity name="team" from="teamid" to="teamid" alias="t" intersect="true">
                                  <attribute name="name" />
                                  <attribute name="teamid" />
                                  <link-entity name="teammembership" from="teamid" to="teamid" alias="tm" intersect="true">          
                                      <filter>
                                        <condition attribute="systemuserid" operator="eq" value="${userId}" />
                                      </filter>         
                                  </link-entity>
                                </link-entity>
                              </link-entity>
                            </entity>
                          </fetch>`;
  var escapedFetchXML = encodeURIComponent(originalFetchXML);

  var result = await Xrm.WebApi.retrieveMultipleRecords("role", "?fetchXml=" + escapedFetchXML);

  var rolesByTeam = [];
  result.entities.forEach((r) => {
    var r = {
      name: r.name,
      id: r.roleid,
      teamName: r["t.name"],
      teamId: r["t.teamid"],
    };
    rolesByTeam.push(r);
  });

  return rolesByTeam;
}

async function listSecurityRoles() {
  var currentUser = Xrm.Utility.getGlobalContext().userSettings.userName;
  var url = Xrm.Page.context.getClientUrl();

  var allUsers = [];
  var allTeams = [];
  try {
    var uRes = await fetch(
      `${url}/api/data/v9.0/systemusers?$select=systemuserid,fullname,domainname&$filter=fullname ne 'INTEGRATION' and domainname ne 'crmoln2@microsoft.com' and domainname ne 'crmoln2@microsoft.com' and fullname ne 'SYSTEM' and applicationid eq null and issyncwithdirectory eq true&$orderby=fullname asc`,
    );
    var uJson = await uRes.json();
    uJson.value.forEach((u) => {
      allUsers.push({ id: u["systemuserid"], name: u.fullname });
    });

    var tRes = await fetch(`${url}/api/data/v9.0/teams?$select=teamid,name&$filter=teamtype eq 0&$orderby=name asc`);
    var tJson = await tRes.json();
    tJson.value.forEach((t) => {
      allTeams.push({ id: t["teamid"], name: t.name });
    });
  } catch (e) {
    paModal.alert("Error loading users and teams: " + e.message);
    return;
  }

  var userOptions = allUsers.map((u) => ({ value: "U:" + u.id, label: u.name, group: "user" }));
  var teamOptions = allTeams.map((t) => ({ value: "T:" + t.id, label: t.name, group: "team" }));
  var nameOptions = userOptions.concat(teamOptions);

  if (nameOptions.length == 0) {
    paModal.alert("No users or teams found");
    return;
  }

  var defaultUser = allUsers.find((u) => u.name === currentUser);
  var defaultValue = defaultUser ? "U:" + defaultUser.id : nameOptions[0].value;

  var res = await paModal.form("List security roles", [
    { name: "all", label: "All users & teams", type: "checkbox", defaultValue: false, disables: ["scope", "name"] },
    {
      name: "scope",
      label: "Look up roles for",
      type: "select",
      options: [
        { value: "user", label: "User" },
        { value: "team", label: "Team" },
      ],
      defaultValue: "user",
    },
    {
      name: "name",
      label: "Name",
      type: "combobox",
      options: nameOptions,
      defaultValue: defaultValue,
      filterBy: "scope",
      placeholder: "Type to search...",
    },
  ]);
  if (res == null) return;

  var teams = [];
  var users = [];

  if (res.all) {
    users = allUsers.slice();
    teams = allTeams.slice();
  } else {
    var sel = res.name || "";
    if (sel === "") return;
    if (sel.startsWith("U:")) {
      var uid = sel.substring(2);
      var selectedUser = allUsers.find((x) => x.id === uid);
      if (selectedUser) users.push(selectedUser);
    } else if (sel.startsWith("T:")) {
      var tid = sel.substring(2);
      var selectedTeam = allTeams.find((x) => x.id === tid);
      if (selectedTeam) teams.push(selectedTeam);
    }
  }

  var orgSettings = Xrm.Utility.getGlobalContext().organizationSettings;

  var allRoles = [];

  for (let i = 0; i < users.length; i++) {
    const userName = users[i].name;
    const userId = users[i].id;

    var originalFetchXML = `<fetch>
                              <entity name="role">
                                <attribute name="name" />
                                <attribute name="roleid" />
                                <link-entity name="systemuserroles" from="roleid" to="roleid" intersect="true">     
                                    <filter>
                                      <condition attribute="systemuserid" operator="eq" value="${userId}" />
                                    </filter>      
                                </link-entity>
                              </entity>
                            </fetch>`;
    var escapedFetchXML = encodeURIComponent(originalFetchXML);

    var url = Xrm.Page.context.getClientUrl();
    var result = await fetch(url + "/api/data/v9.2/roles?fetchXml=" + escapedFetchXML, {
      method: "GET",
      headers: header,
    });
    var resp = await result.json();

    if (resp.error) {
      paModal.alert("Error: " + resp.error.message);
      return;
    }

    var values = resp.value;

    var roles = values.map((r) => {
      return { name: r.name, id: r.roleid };
    });

    var teamRoles = await getTeamSecurityRoles(userId);
    allRoles.push({ user: userName, userId: userId, roles: roles.concat(teamRoles) });

    window.postMessage(
      {
        type: "GIVE_ME_SECURITY",
        roles: allRoles,
        first: i == 0,
        last: i == users.length - 1 && teams.length == 0,
        orgId: orgSettings.organizationId,
        envId: orgSettings.bapEnvironmentId,
        url: url,
      },
      "*",
    );
  }
  for (let i = 0; i < teams.length; i++) {
    const teamName = teams[i].name;
    const teamId = teams[i].id;
    var originalFetchXML = `<fetch>
                              <entity name='role'>
                                <attribute name='name' />
                                <link-entity name='teamroles' from='roleid' to='roleid' intersect='true'>
                                  <filter>
                                    <condition attribute='teamid' operator='eq' value='${teamId}' />
                                  </filter>
                                </link-entity>
                              </entity>
                            </fetch>`;
    var escapedFetchXML = encodeURIComponent(originalFetchXML);

    var url = Xrm.Page.context.getClientUrl();
    var result = await fetch(url + "/api/data/v9.2/roles?fetchXml=" + escapedFetchXML, {
      method: "GET",
      headers: header,
    });
    var resp = await result.json();
    if (resp.error) {
      paModal.alert("Error: " + resp.error.message);
      return;
    }
    var values = resp.value;
    var roles = values.map((r) => {
      return { name: r.name, id: r.roleid };
    });
    allRoles.push({ team: teamName, teamId: teamId, roles: roles });

    window.postMessage(
      {
        type: "GIVE_ME_SECURITY",
        roles: allRoles,
        first: i == 0 && users.length == 0,
        last: i == teams.length - 1,
        orgId: orgSettings.organizationId,
        envId: orgSettings.bapEnvironmentId,
        url: url,
      },
      "*",
    );
  }
}

async function getAttributeType(entityName, field) {
  try {
    var clientUrl = Xrm.Page.context.getClientUrl();
    var res = await fetch(
      `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes(LogicalName='${field}')?$select=AttributeType`,
      { headers: { Accept: "application/json", "OData-MaxVersion": "4.0", "OData-Version": "4.0" } },
    );
    if (!res.ok) return null;
    var data = await res.json();
    return data.AttributeType || null;
  } catch (e) {
    return null;
  }
}

var METADATA_HEADERS = { Accept: "application/json", "OData-MaxVersion": "4.0", "OData-Version": "4.0" };

async function getLookupInfo(entityName, field) {
  try {
    var clientUrl = Xrm.Page.context.getClientUrl();
    var targetsRes = await fetch(
      `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes(LogicalName='${field}')/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=Targets`,
      { headers: METADATA_HEADERS },
    );
    if (!targetsRes.ok) return null;
    var targetsData = await targetsRes.json();

    var relRes = await fetch(
      `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')?$select=LogicalName&$expand=ManyToOneRelationships($select=ReferencingAttribute,ReferencingEntityNavigationPropertyName,ReferencedEntity)`,
      { headers: METADATA_HEADERS },
    );
    var relData = relRes.ok ? await relRes.json() : { ManyToOneRelationships: [] };

    var navByTarget = {};
    (relData.ManyToOneRelationships || []).forEach(function (r) {
      if (r.ReferencingAttribute === field) navByTarget[r.ReferencedEntity] = r.ReferencingEntityNavigationPropertyName;
    });

    return { targets: targetsData.Targets || [], navByTarget: navByTarget };
  } catch (e) {
    return null;
  }
}

async function getEntitySetAndName(entityLogicalName) {
  try {
    var clientUrl = Xrm.Page.context.getClientUrl();
    var res = await fetch(
      `${clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')?$select=EntitySetName,PrimaryNameAttribute`,
      { headers: METADATA_HEADERS },
    );
    if (!res.ok) return null;
    var data = await res.json();
    return { entitySet: data.EntitySetName, primaryName: data.PrimaryNameAttribute };
  } catch (e) {
    return null;
  }
}

async function updateLookupField(entityName, entityId, field, rawValue, onForm) {
  var parts = String(rawValue).split(":");
  var targetEntity = null;
  var guid = null;
  if (parts.length >= 2) {
    targetEntity = parts[0].trim();
    guid = parts.slice(1).join(":").trim();
  } else {
    guid = String(rawValue).trim();
  }
  guid = guid.replace(/[{}]/g, "").trim();
  if (guid === "") return;

  var info = await getLookupInfo(entityName, field);
  if (!info) {
    paModal.alert("Could not read lookup metadata for " + field);
    return;
  }

  if (!targetEntity) {
    if (info.targets.length === 1) {
      targetEntity = info.targets[0];
    } else {
      paModal.alert(`This is a polymorphic lookup. Enter the value as "entitylogicalname:guid".\nTargets: ${info.targets.join(", ")}`);
      return;
    }
  }
  if (info.targets.indexOf(targetEntity) === -1) {
    paModal.alert(`"${targetEntity}" is not a valid target for this lookup.\nTargets: ${info.targets.join(", ")}`);
    return;
  }

  var targetMeta = await getEntitySetAndName(targetEntity);
  if (!targetMeta) {
    paModal.alert("Could not read metadata for " + targetEntity);
    return;
  }

  if (onForm) {
    var name = "";
    try {
      var rec = await Xrm.WebApi.retrieveRecord(targetEntity, guid, `?$select=${targetMeta.primaryName}`);
      name = rec[targetMeta.primaryName] || "";
    } catch (e) {
      // ignore, display name is optional
    }
    try {
      onForm.setValue([{ id: guid, entityType: targetEntity, name: name }]);
    } catch (e) {
      paModal.alert("Error: " + e.message);
    }
    return;
  }

  var navProp = info.navByTarget[targetEntity];
  if (!navProp) {
    paModal.alert("Could not resolve the navigation property for this lookup.");
    return;
  }

  var entity = {};
  entity[navProp + "@odata.bind"] = `/${targetMeta.entitySet}(${guid})`;

  try {
    await Xrm.WebApi.updateRecord(entityName, entityId, entity);
    paModal.alert("Field updated successfully!");
  } catch (e) {
    paModal.alert("Error: " + e.message);
  }
}

function coerceValue(raw, type, forForm) {
  if (raw == null) return raw;
  var t = String(type || "").toLowerCase();
  var s = String(raw).trim();

  if (t === "boolean") {
    return s.toLowerCase() === "true" || s === "1" || s.toLowerCase() === "yes";
  }
  if (t === "integer" || t === "bigint" || t === "picklist" || t === "optionset" || t === "state" || t === "status") {
    var n = parseInt(s, 10);
    return isNaN(n) ? raw : n;
  }
  if (t === "decimal" || t === "double" || t === "money") {
    var f = parseFloat(s);
    return isNaN(f) ? raw : f;
  }
  if (t === "multiselectpicklist" || t === "multiselectoptionset") {
    return s
      .split(",")
      .map(function (v) {
        return parseInt(v.trim(), 10);
      })
      .filter(function (x) {
        return !isNaN(x);
      });
  }
  if (t === "datetime") {
    if (forForm) {
      var d = new Date(s);
      return isNaN(d.getTime()) ? raw : d;
    }
    return s;
  }

  // string, memo, uniqueidentifier, lookup, unknown -> keep as-is
  return raw;
}

async function updateField() {
  var entityName = Xrm.Page.data.entity.getEntityName();
  var entityId = Xrm.Page.data.entity.getId().slice(1, -1);

  var res = await paModal.form("Quick field update", [
    { name: "field", label: "Field logical name", placeholder: "fieldname" },
    { name: "value", label: "Value", placeholder: "value (lookup: guid or entity:guid)" },
  ]);
  if (res == null) return;

  var field = (res.field || "").trim();
  if (field === "") return;
  var value = res.value;
  if (value == null) return;

  var onForm = Xrm.Page.getAttribute(field);

  var type = onForm ? onForm.getAttributeType() : await getAttributeType(entityName, field);

  var typeLower = String(type || "").toLowerCase();
  if (typeLower === "lookup" || typeLower === "customer" || typeLower === "owner") {
    await updateLookupField(entityName, entityId, field, value, onForm);
    return;
  }

  if (onForm) {
    try {
      onForm.setValue(coerceValue(value, type, true));
      return;
    } catch (e) {
      paModal.alert("Error: " + e.message);
      return;
    }
  }

  var entity = {};
  entity[field] = coerceValue(value, type, false);

  try {
    await Xrm.WebApi.updateRecord(entityName, entityId, entity);
    paModal.alert("Field updated successfully!");
  } catch (e) {
    paModal.alert("Error: " + e.message);
  }
}

async function retrieveRecords() {
  var fetchXml = await paModal.prompt(
    "Enter fetchXml",
    '<fetch top="50">\n  <entity name="account">\n    <attribute name="name" />\n  </entity>\n</fetch>',
    {
      multiline: true,
      rows: 14,
    },
  );
  if (fetchXml == null || fetchXml.trim() === "") return;

  var match = fetchXml.match(/<entity\s+name\s*=\s*["']([^"']+)["']/i);
  if (!match) {
    paModal.alert('⚠️ Could not find an <entity name="..."> in the provided fetchXml');
    return;
  }
  var entityName = match[1];

  var escapedFetchXML = encodeURIComponent(fetchXml);

  var result = await Xrm.WebApi.retrieveMultipleRecords(entityName, "?fetchXml=" + escapedFetchXML);

  window.postMessage(
    {
      type: "GIVE_ME_FETCH_RESULTS",
      result: result,
      entityName: entityName,
      url: Xrm.Page.context.getClientUrl(),
    },
    "*",
  );
}

async function getAllFields() {
  var entityName = Xrm.Page.data.entity.getEntityName();
  var entityId = Xrm.Page.data.entity.getId().slice(1, -1);

  var result = await Xrm.WebApi.retrieveRecord(entityName, entityId);

  var fields = [];

  var url = Xrm.Page.context.getClientUrl();
  var attributeMetadata = await fetch(
    url + `/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes?$select=LogicalName,SourceType`,
    {
      method: "GET",
      headers: header,
    },
  );
  var resp = await attributeMetadata.json();

  var altKeyMetadata = await fetch(
    url + `/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')?$select=SchemaName&$expand=Keys($select=KeyAttributes)`,
    {
      method: "GET",
      headers: header,
    },
  );
  var altKeyResp = await altKeyMetadata.json();

  var altKeys = altKeyResp.Keys.map((k) => k.KeyAttributes).flat();

  Object.entries(result).forEach(([key, value]) => {
    var onForm = Xrm.Page.getAttribute(key) != null;

    var fieldName = key;
    var parts = key.split("_value");
    if (parts.length > 1) {
      fieldName = key.split("_")[1];
    }
    if (!onForm) {
      onForm = Xrm.Page.getAttribute(fieldName) != null;
    }

    var behavior = resp.value.find((a) => a.LogicalName == fieldName)?.SourceType;

    var isAltKey = altKeys.includes(fieldName);
    fields.push({ name: key, value: value, onForm: onForm, behavior: behavior, isAltKey: isAltKey });
  });
  window.postMessage(
    {
      type: "GIVE_ME_ALL_FIELDS",
      result: result,
      fields: fields,
      entityName: entityName,
    },
    "*",
  );
}

async function listFlowDependencies() {
  var typeOptions = [
    { value: 5, label: "Modern Flows", checked: true },
    { value: 2, label: "Business Rules", checked: true },
    { value: 0, label: "Workflows", checked: true },
    { value: 3, label: "Actions", checked: true },
    { value: 4, label: "Business Process Flows", checked: true },
    { value: -1, label: "Plugin Steps", checked: true },
    { value: -2, label: "Environment Variables", checked: true },
    { value: -3, label: "Web Resource files (slow)", checked: false },
  ];

  var selection = await paModal.select("Which dependencies do you want to check?", typeOptions, {
    okText: "Check",
    input: { label: "Keyword to search for in processes", placeholder: "e.g. field logical name" },
  });
  if (selection == null) return;

  var selectedTypes = selection.selected;
  var term = selection.value;
  if (selectedTypes.length === 0 || term == null || term === "") return;

  var wantsPlugins = selectedTypes.includes(-1);
  var wantsEnvVars = selectedTypes.includes(-2);
  var wantsWebResources = selectedTypes.includes(-3);
  var wantsProcesses = selectedTypes.some((t) => t !== -1 && t !== -2 && t !== -3);

  var wrNameFilter = "";
  if (wantsWebResources) {
    var wrAnswer = await paModal.prompt(
      "Scanning web resource files downloads and searches every unmanaged JavaScript/HTML web resource for the keyword. This is a long running operation and may take a while in large environments.\n\nOptionally filter which web resources to scan by name (leave blank to scan all):",
      "",
      { okText: "Search web resources", cancelText: "Skip web resources", placeholder: "e.g. account or new_" },
    );
    if (wrAnswer == null) {
      selectedTypes = selectedTypes.filter((t) => t !== -3);
      wantsWebResources = false;
      if (selectedTypes.length === 0) return;
    } else {
      wrNameFilter = wrAnswer.trim();
    }
  }

  window.postMessage(
    {
      type: "GIVE_ME_FLOW_DEPENDENCIES",
      start: true,
      fieldName: term,
      wrNameFilter: wantsWebResources ? wrNameFilter : "",
      url: location.href.split("/main")[0],
      envId: Xrm.Utility.getGlobalContext().organizationSettings.bapEnvironmentId,
    },
    "*",
  );

  var startTime = performance.now();

  var fetchXml = `<fetch>
  <entity name="workflow">
    <attribute name="name" />
    <attribute name="category" />
    <attribute name="statecode" />
    <attribute name="statuscode" />
    <attribute name="workflowid" />
    <attribute name="primaryentity" />
    <filter>       
      <condition attribute="type" operator="eq" value="1" />
      <condition attribute="category" operator="in">
        ${selectedTypes
          .filter((t) => t !== -1)
          .map((c) => `<value>${c}</value>`)
          .join("")}
      </condition>
      <filter type="or">
       <condition attribute="clientdata" operator="like" value="%${term}%" />
        <condition attribute='triggeronupdateattributelist' operator='like' value='%${term}%' />
        <condition attribute='xaml' operator='like' value='%Attribute=&quot;${term}&quot;%' />
        <condition attribute='xaml' operator='like' value='%${term}%' /> // in case of custom workflows
      </filter>
    </filter>
    <order attribute="name"/>
  </entity>
</fetch>`;

  var escapedFetchXML = encodeURIComponent(fetchXml);

  var processes = [];

  if (wantsProcesses) {
    var result = await Xrm.WebApi.retrieveMultipleRecords("workflow", "?fetchXml=" + escapedFetchXML);

    result.entities.forEach((e) => {
      if (!selectedTypes.includes(e["category"])) return;

      processes.push({
        id: e["workflowid"],
        name: e["name"],
        status_display: e["statecode@OData.Community.Display.V1.FormattedValue"],
        status: e["statecode"],
        category_display: e["category@OData.Community.Display.V1.FormattedValue"],
        category: e["category"],
        primary_entity: e["primaryentity"],
      });
    });
  }

  // PLUGIN STEPS
  if (wantsPlugins) {
    var fetchSteps = `<fetch>
  <entity name='sdkmessageprocessingstep'>
    <attribute name='filteringattributes' />
    <attribute name='plugintypeid' />
    <attribute name='statuscode' />
    <link-entity name='plugintype' from='plugintypeid' to='plugintypeid' alias='p'>
      <attribute name='name' />
    </link-entity>
    <link-entity name='sdkmessage' from='sdkmessageid' to='sdkmessageid' alias='m'>
      <attribute name='name' />
    </link-entity>
    <link-entity name='sdkmessagefilter' from='sdkmessagefilterid' to='sdkmessagefilterid' alias='f' link-type='outer'>
      <attribute name='primaryobjecttypecode' />
    </link-entity>
    <filter type='or'>
      <link-entity name='sdkmessageprocessingstepimage' from='sdkmessageprocessingstepid' to='sdkmessageprocessingstepid' link-type='any' alias='i'>
        <filter>
          <condition attribute='attributes' operator='like' value='%${term}%' />
        </filter>
      </link-entity>
      <filter>
        <condition attribute='filteringattributes' operator='like' value='%${term}%' />
      </filter>
    </filter>
 </entity>
</fetch>`;

    var escapedFetchXML2 = encodeURIComponent(fetchSteps);

    var result2 = await Xrm.WebApi.retrieveMultipleRecords("sdkmessageprocessingstep", "?fetchXml=" + escapedFetchXML2);

    result2.entities.forEach((e) => {
      processes.push({
        id: e["sdkmessageprocessingstepid"],
        name: e["p.name"],
        status_display: e["statuscode@OData.Community.Display.V1.FormattedValue"],
        status: e["statuscode"],
        category_display: "Plugin",
        category: -1,
        message: e["m.name"],
        primary_entity: e["f.primaryobjecttypecode"],
        pl_image: !e["filteringattributes"]?.includes(term),
      });
    });
  }

  // ENVIRONMENT VARIABLES
  if (wantsEnvVars) {
    var fetchEnvVars = `<fetch>
  <entity name='environmentvariabledefinition'>
    <attribute name='schemaname' />
    <attribute name='displayname' />
    <attribute name='defaultvalue' />
    <attribute name='statecode' />
    <attribute name='environmentvariabledefinitionid' />
    <link-entity name='environmentvariablevalue' from='environmentvariabledefinitionid' to='environmentvariabledefinitionid' link-type='outer' alias='ev'>
      <attribute name='value' />
    </link-entity>
    <filter type='or'>
      <condition attribute='schemaname' operator='like' value='%${term}%' />
      <condition attribute='displayname' operator='like' value='%${term}%' />
      <condition attribute='defaultvalue' operator='like' value='%${term}%' />
      <condition entityname='ev' attribute='value' operator='like' value='%${term}%' />
    </filter>
<order attribute='schemaname' />
  </entity>
</fetch>`;

    var escapedEnvVars = encodeURIComponent(fetchEnvVars);

    var resultEV = await Xrm.WebApi.retrieveMultipleRecords("environmentvariabledefinition", "?fetchXml=" + escapedEnvVars);

    resultEV.entities.forEach((e) => {
      processes.push({
        id: e["environmentvariabledefinitionid"],
        name: e["displayname"] || e["schemaname"],
        status_display: "Activated",
        status: 1,
        category_display: "Environment Variable",
        category: -2,
        primary_entity: e["schemaname"],
      });
    });
  }

  if (wantsWebResources) {
    var termLower = term.toLowerCase();
    var wrBaseUrl = location.href.split("/main")[0];

    var wrNameCondition = wrNameFilter ? ` and contains(name,'${wrNameFilter.replace(/'/g, "''")}')` : "";

    var wrResult = await Xrm.WebApi.retrieveMultipleRecords(
      "webresource",
      "?$select=name,displayname,webresourceid,webresourcetype,content&$filter=ismanaged eq false and (webresourcetype eq 1 or webresourcetype eq 3)" +
        wrNameCondition +
        "&$orderby=name asc",
    );

    wrResult.entities.forEach((e) => {
      var decoded = "";
      try {
        decoded = e["content"] ? atob(e["content"]) : "";
      } catch (err) {
        decoded = "";
      }

      if (!decoded.toLowerCase().includes(termLower)) return;

      processes.push({
        id: e["webresourceid"],
        name: e["name"],
        status_display: "Active",
        status: 1,
        category_display: "Web Resource",
        category: -3,
        primary_entity: e["webresourcetype@OData.Community.Display.V1.FormattedValue"] || "none",
        link: wrBaseUrl + "/WebResources/" + e["name"],
        content: decoded,
      });
    });
  }

  processes.sort(function (a, b) {
    var nameA = a.name.toLowerCase();
    var nameB = b.name.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  var executionTime = Math.round(performance.now() - startTime);

  window.postMessage(
    {
      type: "GIVE_ME_FLOW_DEPENDENCIES",
      processes: processes,
      fieldName: term,
      wrNameFilter: wantsWebResources ? wrNameFilter : "",
      executionTime: executionTime,
      url: location.href.split("/main")[0],
      envId: Xrm.Utility.getGlobalContext().organizationSettings.bapEnvironmentId,
    },
    "*",
  );
}

async function addWebresourceToSolution() {
  var solutions = [];
  var webresources = [];
  try {
    var solRes = await Xrm.WebApi.retrieveMultipleRecords(
      "solution",
      "?$select=uniquename,friendlyname&$filter=ismanaged eq false and isvisible eq true&$orderby=friendlyname asc",
    );
    solRes.entities.forEach((s) => {
      if (s.uniquename) solutions.push({ unique: s.uniquename, friendly: s.friendlyname });
    });

    var wrRes = await Xrm.WebApi.retrieveMultipleRecords("webresource", "?$select=name,webresourceid&$filter=ismanaged eq false&$orderby=name asc");
    wrRes.entities.forEach((w) => {
      if (w.name) webresources.push({ id: w.webresourceid, name: w.name });
    });
  } catch (e) {
    paModal.alert("Error loading solutions and web resources: " + e.message);
    return;
  }

  if (solutions.length == 0) {
    paModal.alert("No unmanaged solutions found");
    return;
  }
  if (webresources.length == 0) {
    paModal.alert("No web resources found");
    return;
  }

  var solutionOptions = solutions.map((s) => ({ value: s.unique, label: s.friendly ? `${s.friendly} (${s.unique})` : s.unique }));
  var wrOptions = webresources.map((w) => ({ value: w.id, label: w.name }));

  var res = await paModal.form("Add web resource to solution", [
    {
      name: "solution",
      label: "Solution",
      type: "combobox",
      options: solutionOptions,
      defaultValue: solutionOptions[0].value,
      placeholder: "Type to search...",
    },
    {
      name: "webresource",
      label: "Web resource",
      type: "combobox",
      options: wrOptions,
      defaultValue: wrOptions[0].value,
      placeholder: "Type to search...",
    },
  ]);
  if (res == null) return;

  var solutionName = res.solution;
  var wrId = res.webresource;
  if (!solutionName || !wrId) return;

  var selectedWr = webresources.find((w) => w.id === wrId);
  var webresourceName = selectedWr ? selectedWr.name : wrId;

  try {
    var execute_AddSolutionComponent_Request = {
      // Parameters
      ComponentId: { guid: wrId }, // Edm.Guid
      ComponentType: 61, // Edm.Int32
      SolutionUniqueName: solutionName, // Edm.String
      AddRequiredComponents: false, // Edm.Boolean

      getMetadata: function () {
        return {
          boundParameter: null,
          parameterTypes: {
            ComponentId: { typeName: "Edm.Guid", structuralProperty: 1 },
            ComponentType: { typeName: "Edm.Int32", structuralProperty: 1 },
            SolutionUniqueName: { typeName: "Edm.String", structuralProperty: 1 },
            AddRequiredComponents: { typeName: "Edm.Boolean", structuralProperty: 1 },
          },
          operationType: 0,
          operationName: "AddSolutionComponent",
        };
      },
    };

    await Xrm.WebApi.execute(execute_AddSolutionComponent_Request);
  } catch (e) {
    paModal.alert(`Error: ${e.message}`);
    return;
  }

  paModal.alert(`✨ Successfully added "${webresourceName}" to "${solutionName}" ✨`);
}

async function listPlugins() {
  var assemblies = [];
  try {
    var assemblyResult = await Xrm.WebApi.retrieveMultipleRecords("pluginassembly", "?$select=name&$orderby=name asc");
    assemblyResult.entities.forEach((a) => {
      if (a.name) assemblies.push(a.name);
    });
  } catch (e) {
    paModal.alert("Error loading assemblies: " + e.message);
    return;
  }

  if (assemblies.length == 0) {
    paModal.alert("No plugin assemblies found");
    return;
  }

  var assemblyOptions = assemblies.map((n) => ({ value: n, label: n }));

  var res = await paModal.form("List plugins", [
    {
      name: "assembly",
      label: "Assembly name",
      type: "combobox",
      options: assemblyOptions,
      defaultValue: assemblyOptions[0].value,
      placeholder: "Type to search...",
    },
  ]);
  if (res == null) return;

  var assemblyName = (res.assembly || "").trim();
  if (!assemblyName) return;

  var originalFetchXML = `<fetch>
  <entity name='plugintype'>
    <attribute name='name' />
    <link-entity name='pluginassembly' from='pluginassemblyid' to='pluginassemblyid'>
      <filter>
        <condition attribute='name' operator='eq' value='${assemblyName}' />
      </filter>
    </link-entity>
    <link-entity name='sdkmessageprocessingstep' from='plugintypeid' to='plugintypeid' link-type='outer' alias='s'>
      <attribute name='name' />
      <attribute name='filteringattributes' />
      <attribute name='statuscode' />
      <attribute name='mode' />
      <attribute name='sdkmessageprocessingstepid' />
      <link-entity name='sdkmessageprocessingstepimage' from='sdkmessageprocessingstepid' to='sdkmessageprocessingstepid' link-type='outer' alias='i'>
        <attribute name='attributes' />
        <attribute name='componentstate' />
        <attribute name='entityalias' />
        <attribute name='imagetype' />
        <attribute name='messagepropertyname' />
        <attribute name='name' />
      </link-entity>
    </link-entity>
  </entity>
</fetch>`;
  var escapedFetchXML = encodeURIComponent(originalFetchXML);

  var result = await Xrm.WebApi.retrieveMultipleRecords("plugintype", "?fetchXml=" + escapedFetchXML);

  var plugins = [];

  result.entities.forEach((p) => {
    var obj = plugins.find((o) => o.id == p.plugintypeid);
    if (obj) {
      var steps = obj?.steps;

      var image = { name: p["i.name"], attributes: p["i.attributes"] };

      var id = p["s.sdkmessageprocessingstepid"];

      if (steps.find((s) => s.id == id)) return;

      steps.push({ id: id, name: p["s.name"], filter: p["s.filteringattributes"], status: p["s.statuscode"], mode: p["s.mode"], image: image });
      plugins.find((o) => o.id == p.plugintypeid).steps = steps;
    } else {
      var steps = [];
      if (p["s.name"]) {
        var image = { name: p["i.name"], attributes: p["i.attributes"] };

        var id = p["s.sdkmessageprocessingstepid"];

        steps.push({ id: id, name: p["s.name"], filter: p["s.filteringattributes"], status: p["s.statuscode"], mode: p["s.mode"], image: image });
      }
      plugins.push({
        name: p.name,
        id: p.plugintypeid,
        steps: steps,
      });
    }
  });

  window.postMessage(
    {
      type: "GIVE_ME_PLUGINS",
      plugins: plugins,
      assemblyName: assemblyName,
      url: location.href.split("/main")[0],
      envId: Xrm.Utility.getGlobalContext().organizationSettings.bapEnvironmentId,
    },
    "*",
  );
}

async function listEvents() {
  var formId = Xrm.Page.ui.formSelector._formId.guid;

  var result = await Xrm.WebApi.retrieveRecord("systemform", formId, "?$select=formxml,objecttypecode,name");

  var formXml = result["formxml"];

  var entity = result["objecttypecode@OData.Community.Display.V1.FormattedValue"];
  var formName = result["name"];

  var parser = new DOMParser();

  var xml = parser.parseFromString(formXml, "text/xml");

  var url = location.href.split("/main")[0];

  var libraryNodes = xml.querySelectorAll("formLibraries > Library");
  var libraries = Array.from(libraryNodes).map((lib) => ({
    name: lib.getAttribute("name"),
    libraryUniqueId: lib.getAttribute("libraryUniqueId"),
    link: url + "/WebResources/" + lib.getAttribute("name"),
  }));

  // Extract events
  var eventNodes = xml.querySelectorAll("events > event");
  var events = Array.from(eventNodes).map((ev) => ({
    name: ev.getAttribute("name"),
    attribute: ev.getAttribute("attribute") || ev.getAttribute("control"),
    handlers: Array.from(ev.querySelectorAll("Handler")).map((handler) => ({
      functionName: handler.getAttribute("functionName"),
      libraryName: handler.getAttribute("libraryName"),
      enabled: handler.getAttribute("enabled"),
      parameters: handler.getAttribute("parameters"),
    })),
  }));

  window.postMessage(
    {
      type: "GIVE_ME_EVENTS",
      libraries: libraries,
      events: events,
      name: entity + " - " + formName,
    },
    "*",
  );
}

async function listEnvironmentVariables(data) {
  var isRefresh = data?.refresh === true;
  var result = await Xrm.WebApi.retrieveMultipleRecords(
    "environmentvariabledefinition",
    "?$select=environmentvariabledefinitionid,defaultvalue,schemaname,displayname&$expand=environmentvariabledefinition_environmentvariablevalue($select=environmentvariablevalueid,value)",
  );

  var variables = [];
  result.entities.forEach((v) => {
    variables.push({
      id: v.environmentvariabledefinitionid,
      name: v.schemaname,
      displayName: v.displayname,
      value: v["environmentvariabledefinition_environmentvariablevalue"]?.[0]?.value,
      defaultValue: v.defaultvalue,
      valueId: v["environmentvariabledefinition_environmentvariablevalue"]?.[0]?.environmentvariablevalueid,
      link:
        location.href.split("/main")[0] +
        "/main.aspx?pagetype=entityrecord&etn=environmentvariabledefinition&id=" +
        v.environmentvariabledefinitionid,
    });
  });

  window.postMessage(
    {
      type: "GIVE_ME_ENV_VARIABLES",
      variables: variables,
      refresh: isRefresh,
      url: location.href.split("/main")[0],
      envId: Xrm.Utility.getGlobalContext().organizationSettings.bapEnvironmentId,
    },
    "*",
  );
}

async function updateEnvironmentVariable(data) {
  var definitionId = data.definitionId;
  var valueId = data.valueId;
  var newValue = data.value;
  var newDefaultValue = data.defaultValue;

  try {
    if (data.updateDefault) {
      await Xrm.WebApi.updateRecord("environmentvariabledefinition", definitionId, { defaultvalue: newDefaultValue });
    }

    if (data.updateValue) {
      if (valueId) {
        await Xrm.WebApi.updateRecord("environmentvariablevalue", valueId, { value: newValue });
      } else {
        await Xrm.WebApi.createRecord("environmentvariablevalue", {
          value: newValue,
          "EnvironmentVariableDefinitionId@odata.bind": `/environmentvariabledefinitions(${definitionId})`,
        });
      }
    }

    window.postMessage({ type: "ENV_VAR_SAVED" }, "*");
  } catch (e) {
    window.postMessage({ type: "ENV_VAR_SAVE_ERROR", error: e.message }, "*");
  }
}

async function createEnvironmentVariable(data) {
  try {
    var definition = {
      schemaname: data.schemaName,
      displayname: data.displayName || data.schemaName,
      type: parseInt(data.type, 10),
    };
    if (data.defaultValue != null && data.defaultValue !== "") {
      definition.defaultvalue = String(data.defaultValue);
    }

    var created = await Xrm.WebApi.createRecord("environmentvariabledefinition", definition);

    if (data.value != null && data.value !== "") {
      await Xrm.WebApi.createRecord("environmentvariablevalue", {
        value: String(data.value),
        "EnvironmentVariableDefinitionId@odata.bind": `/environmentvariabledefinitions(${created.id})`,
      });
    }

    window.postMessage({ type: "ENV_VAR_SAVED" }, "*");
    await listEnvironmentVariables({ refresh: true });
  } catch (e) {
    window.postMessage({ type: "ENV_VAR_SAVE_ERROR", error: e.message }, "*");
  }
}

function refreshVariables() {
  listEnvironmentVariables({ refresh: true });
}

function listFormLayout() {
  var formId = Xrm.Page.ui.formSelector._formId.guid;
  var formName = Xrm.Page.ui.formSelector.getCurrentItem()?.getLabel() || "";
  var entityName = Xrm.Page.data.entity.getEntityName();

  var tabs = [];

  Xrm.Page.ui.tabs.forEach(function (tab) {
    var tabInfo = {
      label: tab.getLabel(),
      name: tab.getName(),
      visible: tab.getVisible(),
      sections: [],
    };

    tab.sections.forEach(function (section) {
      var sectionInfo = {
        label: section.getLabel(),
        name: section.getName(),
        visible: section.getVisible(),
        controls: [],
      };

      section.controls.forEach(function (control) {
        var controlInfo = {
          name: control.getName(),
          type: control.getControlType(),
          visible: control.getVisible(),
          disabled: typeof control.getDisabled === "function" ? control.getDisabled() : null,
          attribute: null,
          required: null,
        };

        if (typeof control.getAttribute === "function" && control.getAttribute()) {
          var attr = control.getAttribute();
          controlInfo.attribute = attr.getName();
          if (typeof attr.getRequiredLevel === "function") {
            controlInfo.required = attr.getRequiredLevel();
          }
        }

        sectionInfo.controls.push(controlInfo);
      });

      tabInfo.sections.push(sectionInfo);
    });

    tabs.push(tabInfo);
  });

  window.postMessage(
    {
      type: "GIVE_ME_FORM_LAYOUT",
      tabs: tabs,
      formName: formName,
      entityName: entityName,
    },
    "*",
  );
}

function formatAuditValue(rawVal, formattedVal) {
  if (rawVal == null) return "";

  var raw = String(rawVal);
  if (formattedVal != null && String(formattedVal) !== "" && String(formattedVal) !== raw) {
    return String(formattedVal) + " (" + raw + ")";
  }

  return raw;
}

async function listAuditHistory() {
  var entityName = Xrm.Page.data.entity.getEntityName();
  var entityId = Xrm.Page.data.entity.getId().replace("{", "").replace("}", "");
  var url = Xrm.Page.context.getClientUrl();

  var objectTypeCode;
  try {
    var metaResult = await fetch(url + `/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')?$select=ObjectTypeCode`, {
      method: "GET",
      headers: header,
    });
    var metaResp = await metaResult.json();
    objectTypeCode = metaResp.ObjectTypeCode;
  } catch (e) {
    paModal.alert("Error fetching entity metadata: " + e.message);
    return;
  }

  var fetchXml = `<fetch>
    <entity name="audit">
      <attribute name="auditid" />
      <attribute name="createdon" />
      <attribute name="operation" />
      <attribute name="action" />
      <attribute name="userid" />
      <attribute name="changedata" />
      <filter>
        <condition attribute="objectid" operator="eq" value="${entityId}" />
        <condition attribute="objecttypecode" operator="eq" value="${objectTypeCode}" />
      </filter>
      <order attribute="createdon" descending="true" />
    </entity>
  </fetch>`;

  var escapedFetchXML = encodeURIComponent(fetchXml);

  var result;
  try {
    result = await fetch(url + "/api/data/v9.2/audits?fetchXml=" + escapedFetchXML, {
      method: "GET",
      headers: header,
    });
    result = await result.json();
  } catch (e) {
    paModal.alert("Error fetching audit records: " + e.message);
    return;
  }

  if (result.error) {
    paModal.alert("Error: " + result.error.message);
    return;
  }

  var auditRecords = [];

  // Open tab immediately before fetching details
  window.postMessage(
    {
      type: "GIVE_ME_AUDIT_HISTORY",
      records: auditRecords,
      entityName: entityName,
      entityId: entityId,
      url: url,
      first: true,
      last: result.value.length === 0,
    },
    "*",
  );

  for (var i = 0; i < result.value.length; i++) {
    var entity = result.value[i];
    var auditId = entity["auditid"];
    var operationValue = entity["operation"];
    var operation = entity["operation@OData.Community.Display.V1.FormattedValue"] || entity["operation"];
    var event = entity["action@OData.Community.Display.V1.FormattedValue"] || entity["action"];

    var detailResult;
    try {
      detailResult = await fetch(url + `/api/data/v9.2/audits(${auditId})/Microsoft.Dynamics.CRM.RetrieveAuditDetails()`, {
        method: "GET",
        headers: header,
      });
      detailResult = await detailResult.json();
    } catch (e) {
      continue;
    }

    var auditDetail = detailResult?.AuditDetail;
    var oldValues = auditDetail?.OldValue || {};
    var newValues = auditDetail?.NewValue || {};

    var allKeys = new Set([...Object.keys(newValues).filter((k) => !k.includes("@")), ...Object.keys(oldValues).filter((k) => !k.includes("@"))]);

    var changedFields = [];
    allKeys.forEach(function (key) {
      var newVal = newValues[key];
      var oldVal = oldValues[key];

      if (newVal === oldVal) return;

      var displayKey = key;
      if (displayKey.startsWith("_") && displayKey.endsWith("_value")) {
        displayKey = displayKey.slice(1, -6);
      }

      var formattedKey = key + "@OData.Community.Display.V1.FormattedValue";
      var newFormatted = newValues[formattedKey];
      var oldFormatted = oldValues[formattedKey];

      changedFields.push({
        field: displayKey,
        newValue: formatAuditValue(newVal, newFormatted),
        oldValue: formatAuditValue(oldVal, oldFormatted),
      });
    });

    if (changedFields.length === 0) {
      changedFields.push({ field: "-", newValue: "-", oldValue: "-" });
    }

    changedFields.forEach(function (cf) {
      auditRecords.push({
        auditId: auditId,
        operation: operation,
        operationValue: operationValue,
        event: event,
        field: cf.field,
        newValue: cf.newValue,
        oldValue: cf.oldValue,
        createdOn: entity["createdon@OData.Community.Display.V1.FormattedValue"] || entity["createdon"],
        createdOnRaw: entity["createdon"],
        user: entity["_userid_value@OData.Community.Display.V1.FormattedValue"] || "",
      });
    });

    // Send progressive update
    window.postMessage(
      {
        type: "GIVE_ME_AUDIT_HISTORY",
        records: auditRecords,
        entityName: entityName,
        entityId: entityId,
        url: url,
        first: false,
        last: i === result.value.length - 1,
      },
      "*",
    );
  }
}

async function listRibbon() {
  var entityName = null;
  try {
    if (typeof Xrm !== "undefined" && Xrm.Page && Xrm.Page.data && Xrm.Page.data.entity) {
      entityName = Xrm.Page.data.entity.getEntityName();
    }
  } catch (e) {
    entityName = null;
  }
  if (!entityName) {
    var m = location.href.match(/[?&]etn=([^&]+)/i);
    if (m) entityName = decodeURIComponent(m[1]);
  }
  if (!entityName) {
    entityName = await paModal.prompt("Entity logical name for the ribbon?");
  }
  if (!entityName) return;

  // Open the results tab immediately with a loading state, then stream results.
  window.postMessage({ type: "GIVE_ME_RIBBON", loading: true, entity: entityName }, "*");

  var clientUrl = Xrm.Utility.getGlobalContext().getClientUrl();
  var wrBaseUrl = location.href.split("/main")[0];

  // Retrieve each ribbon location separately so every button can be tagged
  // with the location(s) it appears in (form, view/grid, subgrid).
  var locationFilters = [
    { key: "form", member: "Form" },
    { key: "view", member: "HomepageGrid" },
    { key: "subgrid", member: "SubGrid" },
  ];

  var merged = {};
  var anySuccess = false;
  var firstError = null;

  for (var lf of locationFilters) {
    var xmlText;
    try {
      xmlText = await retrieveRibbonXml(clientUrl, entityName, lf.member);
    } catch (e) {
      if (!firstError) firstError = e.message;
      continue;
    }
    if (!xmlText) continue;
    anySuccess = true;

    parseRibbonButtons(xmlText, wrBaseUrl).forEach(function (b) {
      var key = b.id + "|" + b.commandId;
      if (merged[key]) {
        if (merged[key].locations.indexOf(lf.key) === -1) merged[key].locations.push(lf.key);
      } else {
        b.locations = [lf.key];
        merged[key] = b;
      }
    });
  }

  if (!anySuccess) {
    window.postMessage(
      {
        type: "GIVE_ME_RIBBON",
        loading: false,
        entity: entityName,
        error: firstError ? "Error retrieving ribbon: " + firstError : "No ribbon definitions were found for " + entityName,
      },
      "*",
    );
    return;
  }

  // Keep buttons in ribbon definition order (form, then view, then subgrid).
  var buttons = Object.keys(merged).map((k) => merged[k]);

  // Flag which buttons are actually rendered on the current page's command bar.
  var liveIds = collectVisibleRibbonIds();
  buttons.forEach((b) => (b.visible = isRibbonButtonVisible(b, liveIds)));

  // Fetch the source of every referenced web resource so the code can be shown inline.
  var libNames = {};
  buttons.forEach(function (b) {
    b.functions.forEach((f) => f.library && (libNames[f.library.name] = true));
    b.enableRules.forEach((r) => r.library && (libNames[r.library.name] = true));
    b.displayRules.forEach((r) => r.library && (libNames[r.library.name] = true));
  });
  var libraryContents = await fetchWebResourceContents(Object.keys(libNames));

  window.postMessage(
    {
      type: "GIVE_ME_RIBBON",
      loading: false,
      entity: entityName,
      buttons: buttons,
      libraryContents: libraryContents,
    },
    "*",
  );
}

async function fetchWebResourceContents(names) {
  var map = {};
  if (!names.length) return map;
  try {
    for (var i = 0; i < names.length; i += 20) {
      var chunk = names.slice(i, i + 20);
      var filter = chunk.map((n) => "name eq '" + n.replace(/'/g, "''") + "'").join(" or ");
      var res = await Xrm.WebApi.retrieveMultipleRecords(
        "webresource",
        "?$select=name,content&$filter=(" + filter + ") and (webresourcetype eq 1 or webresourcetype eq 3)",
      );
      res.entities.forEach((e) => (map[e.name] = e.content ? atob(e.content) : ""));
    }
  } catch (e) {
    // Leave libraries without content; the UI falls back to opening the web resource URL.
  }
  return map;
}

function collectVisibleRibbonIds() {
  var ids = [];
  document.querySelectorAll("[data-id],[data-lp-id]").forEach(function (el) {
    var tag = el.tagName.toLowerCase();
    var role = el.getAttribute("role") || "";
    var actionable = tag === "button" || role.indexOf("menuitem") === 0 || role === "button";
    if (!actionable) return;
    if (el.offsetParent === null && el.getClientRects().length === 0) return;
    var did = el.getAttribute("data-id");
    var lp = el.getAttribute("data-lp-id");
    if (did) ids.push(did);
    if (lp) ids.push(lp);
  });
  return ids;
}

function isRibbonButtonVisible(button, liveIds) {
  for (var i = 0; i < liveIds.length; i++) {
    var lid = liveIds[i];
    if (button.id && lid.indexOf(button.id) !== -1) return true;
    if (button.commandId && lid.indexOf(button.commandId) !== -1) return true;
  }
  return false;
}

async function retrieveRibbonXml(clientUrl, entityName, filterMember) {
  var apiUrl =
    clientUrl +
    "/api/data/v9.2/RetrieveEntityRibbon(EntityName=@p1,RibbonLocationFilter=@p2)" +
    "?@p1='" +
    encodeURIComponent(entityName) +
    "'&@p2=Microsoft.Dynamics.CRM.RibbonLocationFilters'" +
    filterMember +
    "'";

  var resp = await fetch(apiUrl, {
    headers: { Accept: "application/json", "OData-MaxVersion": "4.0", "OData-Version": "4.0" },
  });
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  var json = await resp.json();
  var bytes = ribbonBase64ToBytes(json.CompressedEntityXml);
  var entries = await ribbonUnzip(bytes);
  var decoder = new TextDecoder("utf-8");
  var texts = [];
  for (var entry of entries) {
    var text = decoder.decode(entry.data);
    // Keep every XML part: labels (LocLabels) can be packaged separately from the ribbon.
    if (text.indexOf("<") !== -1 && (text.indexOf("Ribbon") !== -1 || text.indexOf("CommandDefinition") !== -1 || text.indexOf("LocLabel") !== -1)) {
      texts.push(text);
    }
  }
  return texts.length ? texts : null;
}

function parseRibbonButtons(xmlTexts, wrBaseUrl) {
  if (typeof xmlTexts === "string") xmlTexts = [xmlTexts];
  var docs = xmlTexts.map((t) => new DOMParser().parseFromString(t, "text/xml"));

  var commandMap = {};
  var enableRuleMap = {};
  var displayRuleMap = {};
  var locMap = {};

  docs.forEach(function (doc) {
    doc.querySelectorAll("CommandDefinition").forEach((cd) => (commandMap[cd.getAttribute("Id")] = cd));
    doc.querySelectorAll("RuleDefinitions EnableRules > EnableRule").forEach((r) => (enableRuleMap[r.getAttribute("Id")] = r));
    doc.querySelectorAll("RuleDefinitions DisplayRules > DisplayRule").forEach((r) => (displayRuleMap[r.getAttribute("Id")] = r));
    doc.querySelectorAll("LocLabels > LocLabel").forEach((ll) => {
      var titles = ll.querySelectorAll("Titles > Title");
      var picked = null;
      titles.forEach((t) => {
        if (picked == null || t.getAttribute("languagecode") === "1033") picked = t.getAttribute("description");
      });
      locMap[ll.getAttribute("Id")] = picked;
    });
  });

  // Trailing tokens that are structural, not part of a friendly name.
  var GENERIC_SEGMENT =
    /^(button|command|commandbar|menuitem|menusection|flyout|flyoutanchor|group|tab|control|splitbutton|togglebutton|labeltext|title|tooltip\w*)$/i;

  var humanize = function (raw) {
    if (!raw) return "";
    var segs = raw.split(/[.:|]/).filter(Boolean);
    while (segs.length > 1 && GENERIC_SEGMENT.test(segs[segs.length - 1])) segs.pop();
    var seg = segs.pop() || raw;
    seg = seg.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
    return seg.trim();
  };

  var resolveLabel = function (value) {
    if (!value) return "";
    if (value.indexOf("$LocLabels:") === 0) {
      var id = value.substring("$LocLabels:".length);
      return locMap[id] || humanize(id);
    }
    if (value.indexOf("$Resources") === 0) {
      var idx = value.indexOf(":");
      return humanize(idx >= 0 ? value.substring(idx + 1) : value);
    }
    return value;
  };

  var libraryLink = function (library) {
    if (!library) return null;
    var name = library.indexOf("$webresource:") === 0 ? library.substring("$webresource:".length) : library;
    return { name: name, url: wrBaseUrl + "/WebResources/" + name };
  };

  var describeRule = function (ruleEl) {
    var children = Array.from(ruleEl.children);
    if (children.length === 0) return ruleEl.getAttribute("Id") || "";
    return children
      .map((c) => {
        var attrs = Array.from(c.attributes)
          .map((a) => `${a.name}="${a.value}"`)
          .join(" ");
        return attrs ? `${c.tagName} ${attrs}` : c.tagName;
      })
      .join("  |  ");
  };

  var buttonTags = ["Button", "SplitButton", "ToggleButton", "FlyoutAnchor", "MenuSection"];
  var seen = {};
  var buttons = [];

  docs.forEach(function (doc) {
    doc.querySelectorAll("[Command]").forEach((el) => {
      if (buttonTags.indexOf(el.tagName) === -1) return;

      var commandId = el.getAttribute("Command");
      var id = el.getAttribute("Id") || "";
      var key = id + "|" + commandId;
      if (seen[key]) return;
      seen[key] = true;

      var cd = commandMap[commandId];

      var functions = [];
      var urls = [];
      if (cd) {
        cd.querySelectorAll("Actions > JavaScriptFunction").forEach((jf) => {
          functions.push({
            functionName: jf.getAttribute("FunctionName"),
            library: libraryLink(jf.getAttribute("Library")),
          });
        });
        cd.querySelectorAll("Actions > Url").forEach((u) => urls.push(u.getAttribute("Address")));
      }

      var enableRules = [];
      var displayRules = [];
      if (cd) {
        cd.querySelectorAll("EnableRules > EnableRule").forEach((er) => {
          var rule = enableRuleMap[er.getAttribute("Ref") || er.getAttribute("Id")];
          var customFn = rule ? rule.querySelector("CustomRule") : null;
          enableRules.push({
            id: er.getAttribute("Ref") || er.getAttribute("Id"),
            detail: rule ? describeRule(rule) : "",
            library: customFn ? libraryLink(customFn.getAttribute("Library")) : null,
            functionName: customFn ? customFn.getAttribute("FunctionName") : null,
          });
        });
        cd.querySelectorAll("DisplayRules > DisplayRule").forEach((dr) => {
          var rule = displayRuleMap[dr.getAttribute("Ref") || dr.getAttribute("Id")];
          var customFn = rule ? rule.querySelector("CustomRule") : null;
          displayRules.push({
            id: dr.getAttribute("Ref") || dr.getAttribute("Id"),
            detail: rule ? describeRule(rule) : "",
            library: customFn ? libraryLink(customFn.getAttribute("Library")) : null,
            functionName: customFn ? customFn.getAttribute("FunctionName") : null,
          });
        });
      }

      buttons.push({
        id: id,
        label: resolveLabel(el.getAttribute("LabelText")) || resolveLabel(el.getAttribute("ToolTipTitle")) || humanize(id),
        tooltip: resolveLabel(el.getAttribute("ToolTipDescription")),
        commandId: commandId,
        hasDefinition: !!cd,
        functions: functions,
        urls: urls,
        enableRules: enableRules,
        displayRules: displayRules,
      });
    });
  });

  return buttons;
}

function ribbonBase64ToBytes(b64) {
  var binary = atob(b64);
  var len = binary.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Minimal ZIP reader for the OPC package returned by RetrieveEntityRibbon.
// Reads the central directory and inflates deflate entries natively.
async function ribbonUnzip(bytes) {
  var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  var eocd = -1;
  for (var i = bytes.length - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Invalid ribbon archive");

  var count = dv.getUint16(eocd + 10, true);
  var cdOffset = dv.getUint32(eocd + 16, true);

  var entries = [];
  var p = cdOffset;
  for (var n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    var method = dv.getUint16(p + 10, true);
    var compSize = dv.getUint32(p + 20, true);
    var nameLen = dv.getUint16(p + 28, true);
    var extraLen = dv.getUint16(p + 30, true);
    var commentLen = dv.getUint16(p + 32, true);
    var localOffset = dv.getUint32(p + 42, true);
    var name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));

    var lhNameLen = dv.getUint16(localOffset + 26, true);
    var lhExtraLen = dv.getUint16(localOffset + 28, true);
    var dataStart = localOffset + 30 + lhNameLen + lhExtraLen;
    var compData = bytes.subarray(dataStart, dataStart + compSize);

    var data;
    if (method === 0) {
      data = compData;
    } else if (method === 8) {
      data = await ribbonInflateRaw(compData);
    } else {
      data = compData;
    }
    entries.push({ name: name, data: data });

    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function ribbonInflateRaw(compData) {
  var stream = new Blob([compData]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  var buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

// This script is re-injected on every command, so guard against registering
// the message listener more than once (duplicate listeners fire handlers multiple times).
if (!window.__paDataverseListenerAdded) {
  window.__paDataverseListenerAdded = true;
  window.addEventListener("message", function (event, info) {
    if (event.source !== window || !event.data?.type) return;

    const handlers = {
      YOU_HAVE_THE_SIGHT: god,
      LOCATE_ME: loc,
      COPY_GUID: copyGuid,
      OPEN_MAKER: openMaker,
      OPEN_ADMIN: openAdminCenter,
      OPEN_SOLUTION: openSolution,
      SHOW_DIRTY_FIELDS: showDirtyFields,
      SHOW_OPTIONS: getOptions,
      LIST_SECURITY_ROLES: listSecurityRoles,
      QUICK_FIELD_UPDATE: updateField,
      EXECUTE_FETCH_XML: retrieveRecords,
      SHOW_ALL_FIELDS: getAllFields,
      GET_FLOW_DEPENDENCIES: listFlowDependencies,
      ADD_WR_TO_SOL: addWebresourceToSolution,
      LIST_PLUGINS: listPlugins,
      LIST_EVENTS: listEvents,
      LIST_ENV_VARIABLES: listEnvironmentVariables,
      UPDATE_ENV_VARIABLE: updateEnvironmentVariable,
      CREATE_ENV_VARIABLE: createEnvironmentVariable,
      ENV_VAR_SAVED: refreshVariables,
      LIST_FORM_LAYOUT: listFormLayout,
      SHOW_AUDIT_HISTORY: listAuditHistory,
      LIST_RIBBON: listRibbon,
    };

    const handler = handlers[event.data.type];
    if (handler) handler(event?.data?.dataForScript);
  });
}
