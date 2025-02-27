document.addEventListener("DOMContentLoaded", function () {
  getSecurity();
});

function getSecurity() {
  chrome.runtime.sendMessage(
    {
      action: "GET_SECURITY",
    },
    function (response) {
      console.log(response);

      document.getElementById("sec_link").href = `https://admin.powerplatform.microsoft.com/settingredirect/${response.orgId}/securityroles`;

      var content = handleContent(response.roles);

      document.getElementById("security-content").innerHTML = content;

      if (response.last) return;

      getSecurity();
    }
  );
}

function handleContent(allRoles) {
  if (allRoles.length == 0) return "";
  var content = "";

  allRoles.forEach((user) => {
    content += `<div id="user">
        <h1>${user.user}</h1>`;

    content +=
      user.roles.length > 0
        ? `<table id="main">                        
                        <thead>
                        <tr>
                            <th>Role Name</th>
                            <th>Role Id</th>
                            <th>Team Name</th>
                            <th>Team Id</th>
                        </tr>
                        </thead>
                        <tbody>
                        ${user.roles
                          .map(
                            (r) =>
                              `<tr id="main-row">
                                <td>${r.name}</td>
                                <td>${r.id}</td>
                                <td>${r?.teamName ? r.teamName : ""}</td>
                                <td>${r?.teamId ? r.teamId : ""}</td>
                            </tr>`
                          )
                          .join("")}
                        </tbody>
                    </table>`
        : "<div>no roles</div>";
    content += "</div>";
  });

  return content;
}
