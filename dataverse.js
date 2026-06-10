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
    alert("✨  No unsaved changes on this record");
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

  alert(`${title}\n${divider}\n${body}`);
}

function loc() {
  if (typeof Xrm !== "undefined" && Xrm.Page) {
    var field = prompt("Locate field by name");

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

    if (message != "") alert(message);
    else alert("⚠️ Field not found");
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
  var result = await fetch(
    url +
      `/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName,DefaultFormValue&$expand=OptionSet($select=Options),GlobalOptionSet($select=Options)`,
    {
      method: "GET",
      headers: header,
    },
  );
  var resp = await result.json();

  var result2 = await fetch(
    url +
      `/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes/Microsoft.Dynamics.CRM.StatusAttributeMetadata?$select=LogicalName,DefaultFormValue&$expand=OptionSet($select=Options)`,
    {
      method: "GET",
      headers: header,
    },
  );
  var resp2 = await result2.json();

  var result3 = await fetch(
    url +
      `/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes/Microsoft.Dynamics.CRM.StateAttributeMetadata?$select=LogicalName,DefaultFormValue&$expand=OptionSet($select=Options)`,
    {
      method: "GET",
      headers: header,
    },
  );
  var resp3 = await result3.json();

  var result4 = await fetch(
    url +
      `/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes/Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata?$select=LogicalName,DefaultFormValue&$expand=OptionSet($select=Options),GlobalOptionSet($select=Options)`,
    {
      method: "GET",
      headers: header,
    },
  );
  var resp4 = await result4.json();

  //BOOLEAN
  var result5 = await fetch(
    url +
      `/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes/Microsoft.Dynamics.CRM.BooleanAttributeMetadata?$select=LogicalName,DefaultValue&$expand=OptionSet($select=TrueOption,FalseOption)`,
    {
      method: "GET",
      headers: header,
    },
  );
  var resp5 = await result5.json();
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
  var name = prompt("Enter the full name (enter '*' if you want to info for all)\nexample: 'U:{user_name}', 'T:{team_name}'", "U:" + currentUser);
  if (name == null) return;

  var entityName = name.trim().toLowerCase().startsWith("t:") ? "team" : "systemuser";

  var teams = [];
  var users = [];

  if (name == "*") {
    var url = Xrm.Page.context.getClientUrl();
    var res = await fetch(
      `${url}/api/data/v9.0/systemusers?$select=systemuserid,fullname,domainname&$filter=fullname ne 'INTEGRATION' and domainname ne 'crmoln2@microsoft.com' and domainname ne 'crmoln2@microsoft.com' and fullname ne 'SYSTEM' and applicationid eq null and issyncwithdirectory eq true&$orderby=fullname asc`,
    );
    var u = await res.json();
    u.value.forEach((u) => {
      users.push({ id: u["systemuserid"], name: u.fullname });
    });

    var res2 = await fetch(`${url}/api/data/v9.0/teams?$select=teamid,name&$filter=teamtype eq 0&$orderby=name asc`);
    var t = await res2.json();
    t.value.forEach((t) => {
      teams.push({ id: t["teamid"], name: t.name });
    });
  } else {
    if (entityName == "systemuser") {
      var userName = name.toLowerCase().split("u:")[1].trim();
      var user = await Xrm.WebApi.retrieveMultipleRecords("systemuser", `?$filter=fullname eq '${userName}'&$select=systemuserid,fullname`);
      if (user.entities.length == 0) {
        alert("User not found");
        return;
      }
      users.push({ id: user.entities[0].systemuserid, name: user.entities[0].fullname });
    } else {
      var teamName = name.toLowerCase().split("t:")[1].trim();
      var team = await Xrm.WebApi.retrieveMultipleRecords("team", `?$filter=name eq '${teamName}'&$select=teamid,name`);
      if (team.entities.length == 0) {
        alert("Team not found");
        return;
      }
      teams.push({ id: team.entities[0].teamid, name: team.entities[0].name });
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
      alert("Error: " + resp.error.message);
      return;
    }

    var values = resp.value;

    var roles = values.map((r) => {
      return { name: r.name, id: r.roleid };
    });

    var teamRoles = await getTeamSecurityRoles(userId);
    allRoles.push({ user: userName, roles: roles.concat(teamRoles) });

    window.postMessage(
      {
        type: "GIVE_ME_SECURITY",
        roles: allRoles,
        first: i == 0,
        last: i == users.length - 1 && teams.length == 0,
        orgId: orgSettings.organizationId,
        envId: orgSettings.bapEnvironmentId,
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
      alert("Error: " + resp.error.message);
      return;
    }
    var values = resp.value;
    var roles = values.map((r) => {
      return { name: r.name, id: r.roleid };
    });
    allRoles.push({ team: teamName, roles: roles });

    window.postMessage(
      {
        type: "GIVE_ME_SECURITY",
        roles: allRoles,
        first: i == 0 && users.length == 0,
        last: i == teams.length - 1,
        orgId: orgSettings.organizationId,
        envId: orgSettings.bapEnvironmentId,
      },
      "*",
    );
  }
}

function checkInput(input) {
  if (!isNaN(input) && input.trim() !== "") {
    return Number(input);
  }

  let lowerInput = input.toLowerCase();

  if (lowerInput === "true") return true;
  if (lowerInput === "false") return false;

  return input;
}

async function updateField() {
  var entityName = Xrm.Page.data.entity.getEntityName();
  var entityId = Xrm.Page.data.entity.getId().slice(1, -1);
  var field = prompt("Enter the logical name of the field to update", "fieldname");
  if (field == null) return;
  var value = prompt("Enter the value to set", "value");
  if (value == null) return;

  value = checkInput(value);

  var onForm = Xrm.Page.getAttribute(field);
  if (onForm) {
    try {
      Xrm.Page.getAttribute(field).setValue(value);
      return;
    } catch (e) {
      alert("Error: " + e.message);
      return;
    }
  }

  var entity = {};
  entity[field] = value;

  try {
    await Xrm.WebApi.updateRecord(entityName, entityId, entity);
    alert("Field updated successfully!");
  } catch (e) {
    alert("Error: " + e.message);
  }
}

async function retrieveRecords() {
  var entityName = prompt("Enter entity name for fetchXml");
  var fetchXml = prompt("Enter fetchXml (or '*' for all)");

  if (fetchXml == "*") {
    fetchXml = `<fetch><entity name="${entityName}" /></fetch>`;
  }

  var escapedFetchXML = encodeURIComponent(fetchXml);

  var result = await Xrm.WebApi.retrieveMultipleRecords(entityName, "?fetchXml=" + escapedFetchXML);

  window.postMessage(
    {
      type: "GIVE_ME_FETCH_RESULTS",
      result: result,
      entityName: entityName,
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
  var term = prompt("Keyword to search for in processes");
  if (term == null) return;

  window.postMessage(
    {
      type: "GIVE_ME_FLOW_DEPENDENCIES",
      start: true,
      fieldName: term,
      url: location.href.split("/main")[0],
      envId: Xrm.Utility.getGlobalContext().organizationSettings.bapEnvironmentId,
    },
    "*",
  );

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

  var result = await Xrm.WebApi.retrieveMultipleRecords("workflow", "?fetchXml=" + escapedFetchXML);

  var processes = [];
  result.entities.forEach((e) => {
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

  // PLUGIN STEPS
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

  processes.sort(function (a, b) {
    var nameA = a.name.toLowerCase();
    var nameB = b.name.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  window.postMessage(
    {
      type: "GIVE_ME_FLOW_DEPENDENCIES",
      processes: processes,
      fieldName: term,
      url: location.href.split("/main")[0],
      envId: Xrm.Utility.getGlobalContext().organizationSettings.bapEnvironmentId,
    },
    "*",
  );
}

async function addWebresourceToSolution() {
  var solutionName = prompt("Enter logical name of your solution");
  if (!solutionName) return;

  var webresourceName = prompt("Enter logical name of your webresource");
  if (!webresourceName) return;

  try {
    var result = await Xrm.WebApi.retrieveMultipleRecords("webresource", `?$select=webresourceid,name&$filter=name eq '${webresourceName}'&$top=1`);

    if (result.entities.length == 0) {
      alert(`⚠️ Couldn't find webresource with name: ${webresourceName}`);
      return;
    }

    var wrId = result.entities[0].webresourceid;

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
    alert(`Error: ${e.message}`);
    return;
  }

  alert(`✨ Successfully added "${webresourceName}" to "${solutionName}" ✨`);
}

async function listPlugins() {
  var assemblyName = prompt("Assembly name", "Customer.CRM.Plugins");
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
    "?$select=environmentvariabledefinitionid,defaultvalue,schemaname&$expand=environmentvariabledefinition_environmentvariablevalue($select=environmentvariablevalueid,value)",
  );

  var variables = [];
  result.entities.forEach((v) => {
    variables.push({
      id: v.environmentvariabledefinitionid,
      name: v.schemaname,
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
        };

        if (typeof control.getAttribute === "function" && control.getAttribute()) {
          var attr = control.getAttribute();
          controlInfo.attribute = attr.getName();
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
    alert("Error fetching entity metadata: " + e.message);
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
    alert("Error fetching audit records: " + e.message);
    return;
  }

  if (result.error) {
    alert("Error: " + result.error.message);
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
    var operation = entity["operation@OData.Community.Display.V1.FormattedValue"] || entity["operation"];

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

      changedFields.push({
        field: displayKey,
        newValue: newVal != null ? String(newVal) : "",
        oldValue: oldVal != null ? String(oldVal) : "",
      });
    });

    if (changedFields.length === 0) {
      changedFields.push({ field: "-", newValue: "-", oldValue: "-" });
    }

    changedFields.forEach(function (cf) {
      auditRecords.push({
        auditId: auditId,
        operation: operation,
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

window.addEventListener("message", function (event, info) {
  if (event.source !== window || !event.data?.type) return;

  const handlers = {
    YOU_HAVE_THE_SIGHT: god,
    LOCATE_ME: loc,
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
    ENV_VAR_SAVED: refreshVariables,
    LIST_FORM_LAYOUT: listFormLayout,
    SHOW_AUDIT_HISTORY: listAuditHistory,
  };

  const handler = handlers[event.data.type];
  if (handler) handler(event?.data?.dataForScript);
});
