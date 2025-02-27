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

      var secRolesLink = `https://admin.powerplatform.microsoft.com/settingredirect/${response.orgId}/securityroles`;
      document.getElementById("sec_link").href = secRolesLink;

      var content = handleContent(response.roles, secRolesLink);

      document.getElementById("security-content").innerHTML = content;

      if (response.last) return;

      getSecurity();
    }
  );
}

function handleContent(allRoles, link) {
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
                                <td><a href="${link}/${r.id}/roleeditor" target="_blank">${r.name}</a></td>
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
