helper = {
  handleComplexTable(mainTable, columns) {
    var tempTable = document.createElement("table");

    var header = tempTable.insertRow();
    columns.forEach((text) => {
      var th = document.createElement("th");
      th.textContent = text;
      header.appendChild(th);
    });

    // Loop through main table rows
    var mainRows = mainTable.querySelectorAll("tbody > tr");
    mainRows.forEach((mainRow) => {
      var tds = mainRow.querySelectorAll("td");
      var eventName = tds[0]?.innerText.trim() || "";
      var attribute = tds[1]?.innerText.trim() || "";
      var miniTable = tds[2]?.querySelector("table");

      if (miniTable) {
        var miniRows = miniTable.querySelectorAll("tbody > tr");
        miniRows.forEach((miniRow) => {
          var miniTds = miniRow.querySelectorAll("td");
          var libName = miniTds[0]?.innerText.trim() || "";
          var funcName = miniTds[1]?.innerText.trim() || "";
          var enabled = miniTds[2]?.innerText.trim() || "";

          var row = tempTable.insertRow();
          [eventName, attribute, libName, funcName, enabled].forEach((value) => {
            var cell = row.insertCell();
            cell.textContent = value;
          });
        });
      }
    });

    return tempTable;
  },
};
