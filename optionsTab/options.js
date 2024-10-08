chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "updateContentOfOptions") {
    var options = request.options;

    console.log(options);
    var content = `${
      options &&
      options
        .map((o) =>
          o?.values
            .map(
              (v, i) =>
                `<tr>${
                  i == 0 ? `<td rowspan=${o.values.length}>${o?.name}</td>` : ""
                }
                            <td>${v?.displayName}</td>
                            <td>${v?.value}</td>
                            <td>${v?.state == null ? "-" : v?.state}</td>
                        </tr>`
            )
            .join("")
        )
        .join("")
    }`;
    document.getElementById("dynamic-content").innerHTML = content;
  }
});
