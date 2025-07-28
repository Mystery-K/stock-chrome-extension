function httpRequest(callback) {
  var stocks = localStorage.stocks || "sh000001";

  chrome.runtime.sendMessage(
    { type: "fetch_stock", stocks },
    (response) => {
      if (response && response.data) {
        callback(response.data);
      } else {
        console.error("Error fetching data:", response.error);
      }
    }
  );
}

function showResult(result) {
  var table = "<table><tbody>";
  var arr = result.split(";").slice(0, -1);

  arr.forEach(function (item) {
    var itemArr = item.split("=")[1].split('"')[1].split("~"),
      name = itemArr[1],
      code = item.split("=")[0];
    var isUS = code.indexOf("$") !== -1;
    var curr = isUS ? Number(itemArr[1]).toFixed(2) : Number(itemArr[3]).toFixed(2);
    var yest = Number(itemArr[4]).toFixed(2);
    var range = isUS ? itemArr[2] : (((curr - yest) / yest) * 100).toFixed(2);

    table += "<tr>";
    table += "<td>" + name + "</td>";
    table += "<td>" + curr + "</td>";
    table += "<td>" + range + "</td>";
    table += "</tr>";
  });

  table += "</tbody></table>";
  document.getElementById("stock").innerHTML = table;
}

document.getElementById("addBtn").onclick = function () {
  var add = document.getElementById("add"),
    addBtn = document.getElementById("addBtn");

  var input = document.createElement("input");
  input.type = "text";
  input.id = "newStock";

  var saveBtn = document.createElement("input");
  saveBtn.type = "button";
  saveBtn.id = "saveBtn";
  saveBtn.value = "save";

  add.removeChild(addBtn);
  add.appendChild(input);
  add.appendChild(saveBtn);

  document.getElementById("saveBtn").onclick = function () {
    var newStock = document.getElementById("newStock").value;
    var stocks = (localStorage.stocks && localStorage.stocks.split(",")) || [
      "sh000001",
    ];
    stocks.push(newStock);
    localStorage.stocks = stocks;
    httpRequest(showResult);

    add.removeChild(input);
    add.removeChild(saveBtn);
    add.appendChild(addBtn);
  };
};

(function () {
  httpRequest(showResult);
  setInterval(() => {
    httpRequest(showResult);
  }, 1000);
})();