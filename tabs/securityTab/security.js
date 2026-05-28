document.addEventListener("DOMContentLoaded", function () {
  search = document.querySelector("input[name=filter]");
  search.addEventListener("input", function () {
    filterResults();
  });

  getSecurity();
});

var search;

function getSecurity() {
  chrome.runtime.sendMessage(
    {
      action: "GET_SECURITY",
    },
    function (response) {
      var secRolesLink = `https://admin.powerplatform.microsoft.com/settingredirect/${response.orgId}/securityroles`;
      document.getElementById("sec_link").href = secRolesLink;

      var content = handleContent(response.roles, secRolesLink);

      document.getElementById("security-content").innerHTML = content;

      if (response.last) return;

      getSecurity();
    },
  );
}

function filterResults() {
  var searchFilter = search.value.toLowerCase();

  var allDivs = document.getElementById("security-content").children;
  for (var i = 0; i < allDivs.length; i++) {
    var div = allDivs[i];
    if (div.innerText.toLowerCase().includes(searchFilter)) {
      div.style.display = "block";
    } else {
      div.style.display = "none";
    }
  }
}

function handleContent(allRoles, link) {
  if (allRoles.length == 0) return "";
  var content = "";

  var users = allRoles.filter((a) => a.user);
  var teams = allRoles.filter((a) => a.team);

  if (users.length > 0) content += "<h2 id='users'>User roles:</h2>";
  users.forEach((a) => {
    content += `<div id="user">
        <h3>${a.user}</h3>`;
    content +=
      a.roles.length > 0
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
                        ${a.roles
                          .map(
                            (r) =>
                              `<tr id="main-row">
                                <td><a href="${link}/${r.id}/roleeditor" target="_blank">${r.name}</a></td>
                                <td>${r.id}</td>
                                <td>${r?.teamName ? r.teamName : ""}</td>
                                <td>${r?.teamId ? r.teamId : ""}</td>
                            </tr>`,
                          )
                          .join("")}
                        </tbody>
                    </table>`
        : "<div>no roles</div>";
    content += "</div>";
  });

  if (teams.length > 0) content += '<h2 id="teams">Team roles:</h2>';
  teams.forEach((a) => {
    content += `<div id="team">
        <h3>Team: ${a.team}</h3>`;
    content +=
      a.roles.length > 0
        ? `<table id="main">                        
                        <thead>
                        <tr>
                            <th>Role Name</th>
                            <th>Role Id</th>
                        </tr>
                        </thead>
                        <tbody>
                        ${a.roles
                          .map(
                            (r) =>
                              `<tr id="main-row">
                                <td><a href="${link}/${r.id}/roleeditor" target="_blank">${r.name}</a></td>
                                <td>${r.id}</td>
                            </tr>`,
                          )
                          .join("")}
                        </tbody>
                    </table>`
        : "<div>no roles</div>";
    content += "</div>";
  });
  return content;
}
