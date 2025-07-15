helper = {
  handleComplexTable(mainTable, mainColumns, miniColumns) {
    var tempTable = document.createElement("table");

    var header = tempTable.insertRow();
    mainColumns.concat(miniColumns).forEach((text) => {
      var th = document.createElement("th");
      th.textContent = text;
      header.appendChild(th);
    });

    // Loop through main table rows
    var mainRows = mainTable.querySelectorAll("tbody > tr");
    mainRows.forEach((mainRow) => {
      var tds = mainRow.querySelectorAll("td");

      var cols = [];
      for (var i = 0; i < mainColumns.length; i++) {
        var c = tds[i]?.innerText.trim() || "";
        cols.push(c);
      }

      //var eventName = tds[0]?.innerText.trim() || "";
      // var attribute = tds[1]?.innerText.trim() || "";
      var miniTable = tds[cols.length]?.querySelector("table");

      if (miniTable) {
        var miniRows = miniTable.querySelectorAll("tbody > tr");
        miniRows.forEach((miniRow) => {
          var miniTds = miniRow.querySelectorAll("td");

          var cols2 = [];
          for (var i = 0; i < miniColumns.length; i++) {
            var c = miniTds[i]?.innerText.trim() || "";
            cols2.push(c);
          }

          // var libName = miniTds[0]?.innerText.trim() || "";
          // var funcName = miniTds[1]?.innerText.trim() || "";
          // var enabled = miniTds[2]?.innerText.trim() || "";

          var row = tempTable.insertRow();
          cols.concat(cols2).forEach((value) => {
            var cell = row.insertCell();
            cell.textContent = value;
          });
        });
      }
    });

    return tempTable;
  },
};
