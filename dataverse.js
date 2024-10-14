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
  allOptionsets.forEach((optionSet) => {
    try {
      var obj = {};
      obj.LogicalName = optionSet.LogicalName;
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
      data.push(obj);
    } catch (e) {}
  });

  return data;
}

async function listSecurityRoles() {
  var currentUser = Xrm.Utility.getGlobalContext().userSettings.userName;
  var userName = prompt("Enter the full name of the user to list security roles for", currentUser);

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
  if (values.length == 0) {
    alert(`⚠️ No roles found for the user ${userName}`);
    return;
  }

  var roles = values.map((r) => `${r.name} (${r.roleid})`);

  alert("✨ Roles ✨\n" + roles.join("\n"));
}

window.addEventListener("message", function (event) {
  if (event.source === window && event.data.type === "SHOW_OPTIONS") {
    getOptions();
  } else if (event.source === window && event.data.type === "LIST_SECURITY_ROLES") {
    listSecurityRoles();
  }
});
