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
      "*"
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
    }
  );
  var resp = await result.json();

  var result2 = await fetch(
    url +
      `/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes/Microsoft.Dynamics.CRM.StatusAttributeMetadata?$select=LogicalName,DefaultFormValue&$expand=OptionSet($select=Options)`,
    {
      method: "GET",
      headers: header,
    }
  );
  var resp2 = await result2.json();

  var result3 = await fetch(
    url +
      `/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes/Microsoft.Dynamics.CRM.StateAttributeMetadata?$select=LogicalName,DefaultFormValue&$expand=OptionSet($select=Options)`,
    {
      method: "GET",
      headers: header,
    }
  );
  var resp3 = await result3.json();

  var result4 = await fetch(
    url +
      `/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes/Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata?$select=LogicalName,DefaultFormValue&$expand=OptionSet($select=Options),GlobalOptionSet($select=Options)`,
    {
      method: "GET",
      headers: header,
    }
  );
  var resp4 = await result4.json();

  //BOOLEAN
  var result5 = await fetch(
    url +
      `/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')/Attributes/Microsoft.Dynamics.CRM.BooleanAttributeMetadata?$select=LogicalName,DefaultValue&$expand=OptionSet($select=TrueOption,FalseOption)`,
    {
      method: "GET",
      headers: header,
    }
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
  var userName = prompt("Enter the user's full name (enter '*' to get info for all users)", currentUser);
  if (userName == null) return;
  var users = [];

  if (userName == "*") {
    var url = Xrm.Page.context.getClientUrl();
    var res = await fetch(
      `${url}/api/data/v9.0/systemusers?$select=systemuserid,fullname,domainname&$filter=fullname ne 'INTEGRATION' and domainname ne 'crmoln2@microsoft.com' and domainname ne 'crmoln2@microsoft.com' and fullname ne 'SYSTEM' and applicationid eq null and issyncwithdirectory eq true&$orderby=fullname asc`
    );
    var u = await res.json();
    u.value.forEach((u) => {
      users.push({ id: u["systemuserid"], name: u.fullname });
    });
  } else {
    var user = await Xrm.WebApi.retrieveMultipleRecords("systemuser", `?$filter=fullname eq '${userName}'`);
    if (user.entities.length == 0) {
      alert("User not found");
      return;
    }
    users.push({ id: user.entities[0].systemuserid, name: userName });
  }

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
        last: i == users.length - 1,
        orgId: Xrm.Utility.getGlobalContext()._organizationSettings.organizationId,
      },
      "*"
    );
  }
}

async function updateField() {
  var entityName = Xrm.Page.data.entity.getEntityName();
  var entityId = Xrm.Page.data.entity.getId().slice(1, -1);
  var field = prompt("Enter the logical name of the field to update", "fieldname");
  if (field == null) return;
  var value = prompt("Enter the value to set", "value");
  if (value == null) return;

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
  console.log("retrieveRecords");
  var entityName = prompt("Enter entity name for fetchXml");
  var fetchXml = prompt("Enter fetchXml");

  var escapedFetchXML = encodeURIComponent(fetchXml);

  var result = await Xrm.WebApi.retrieveMultipleRecords(entityName, "?fetchXml=" + escapedFetchXML);

  window.postMessage(
    {
      type: "GIVE_ME_FETCH_RESULTS",
      result: result,
      entityName: entityName,
    },
    "*"
  );
}

window.addEventListener("message", function (event) {
  if (event.source === window && event.data.type === "SHOW_OPTIONS") {
    getOptions();
  } else if (event.source === window && event.data.type === "LIST_SECURITY_ROLES") {
    listSecurityRoles();
  } else if (event.source === window && event.data.type === "QUICK_FIELD_UPDATE") {
    updateField();
  } else if (event.source === window && event.data.type === "EXECUTE_FETCH_XML") {
    retrieveRecords();
  }
});
