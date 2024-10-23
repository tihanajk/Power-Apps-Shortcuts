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
  var allOptionsets = resp.value.concat(resp2.value).concat(resp3.value);
  var data = [];

  var formControls = Xrm.Page.ui.controls.get();
  formControls = formControls.filter((c) => c.getControlType() == "optionset").map((c) => c.getAttribute().getName());

  allOptionsets.forEach((optionSet) => {
    try {
      var obj = {};
      var logName = optionSet.LogicalName;
      obj.LogicalName = logName;
      obj.DefaultValue = optionSet.DefaultFormValue;
      var options = optionSet.OptionSet.Options;
      var ops = [];
      options.forEach((o) => {
        var op = {
          Value: o.Value,
          Label: o.Label.LocalizedLabels[0].Label,
          State: o?.State,
        };
        ops.push(op);
      });
      obj.Options = ops;
      obj.OnForm = formControls.includes(logName);
      data.push(obj);
    } catch (e) {}
  });

  return data;
}

async function getTeamSecurityRoles(name) {
  var originalFetchXML = `<fetch>
  <entity name="role">
    <attribute name="name" />
    <attribute name="roleid" />
    <link-entity name="teamroles" from="roleid" to="roleid" alias="tr" intersect="true">
      <link-entity name="team" from="teamid" to="teamid" alias="t" intersect="true">
        <attribute name="name" />
        <attribute name="teamid" />
        <link-entity name="teammembership" from="teamid" to="teamid" alias="tm" intersect="true">
          <link-entity name="systemuser" from="systemuserid" to="systemuserid" alias="u" intersect="true">
            <attribute name="fullname" />
            <filter>
              <condition attribute="fullname" operator="eq" value="${name}" />
            </filter>
          </link-entity>
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
  var users = [];

  if (userName == "*") {
    var res = await fetch(
      "https://org9616a1ad.crm4.dynamics.com/api/data/v9.0/systemusers?%24select=systemuserid%2Cazureactivedirectoryobjectid%2Cdomainname%2Cfullname%2Cisdisabled%2Cislicensed%2Csetupuser%2Ctitle%2Cinternalemailaddress%2Cazurestate%2Cdeletedstate%2Caddress1_telephone1&%24expand=businessunitid(%24select%3Dname%2Cbusinessunitid)%2Cpositionid(%24select%3Dname%2Cpositionid)%2Cparentsystemuserid(%24select%3Dfullname%2Csystemuserid)&%24filter=fullname%20ne%20%27INTEGRATION%27%20and%0A%20%20%20%20%20%20%20%20domainname%20ne%20%27crmoln2%40microsoft.com%27%20and%0A%20%20%20%20%20%20%20%20domainname%20ne%20%27crmoln2%40microsoft.com%27%20and%0A%20%20%20%20%20%20%20%20fullname%20ne%20%27SYSTEM%27%20and%0A%20%20%20%20%20%20%20%20applicationid%20eq%20null%20and%20issyncwithdirectory%20eq%20true&%24orderby=fullname%20asc"
    );
    var u = await res.json();
    u.value.forEach((u) => {
      users.push(u["fullname"]);
    });
  } else users.push(userName);

  var allRoles = [];

  for (let i = 0; i < users.length; i++) {
    const userName = users[i];

    var originalFetchXML = `<fetch>
  <entity name="role">
    <attribute name="name" />
    <attribute name="roleid" />
    <link-entity name="systemuserroles" from="roleid" to="roleid" intersect="true">
      <link-entity name="systemuser" from="systemuserid" to="systemuserid" intersect="true">
        <filter>
          <condition attribute="fullname" operator="eq" value="${userName}" />
        </filter>
      </link-entity>
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
    // if (values.length == 0) {
    //   alert(`⚠️ No roles found for the user ${userName}`);
    //   return;
    // }

    var roles = values.map((r) => {
      return { name: r.name, id: r.roleid };
    });

    var teamRoles = await getTeamSecurityRoles(userName);
    allRoles.push({ user: userName, roles: roles.concat(teamRoles) });

    window.postMessage(
      {
        type: "GIVE_ME_SECURITY",
        roles: allRoles,
        first: i == 0,
        last: i == users.length - 1,
      },
      "*"
    );
  }

  // window.postMessage(
  //   {
  //     type: "GIVE_ME_SECURITY",
  //     roles: allRoles,
  //   },
  //   "*"
  // );

  //alert("✨ Roles ✨\n" + roles.join("\n"));
}

async function updateField() {
  var entityName = Xrm.Page.data.entity.getEntityName();
  var entityId = Xrm.Page.data.entity.getId().slice(1, -1);
  var field = prompt("Enter the logical name of the field to update", "fieldname");
  var value = prompt("Enter the value to set", "value");

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

window.addEventListener("message", function (event) {
  if (event.source === window && event.data.type === "SHOW_OPTIONS") {
    getOptions();
  } else if (event.source === window && event.data.type === "LIST_SECURITY_ROLES") {
    listSecurityRoles();
  } else if (event.source === window && event.data.type === "QUICK_FIELD_UPDATE") {
    updateField();
  }
});
