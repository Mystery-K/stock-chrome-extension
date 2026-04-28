const DEFAULT_STOCKS = ["sh000001"];

let latestRows = [];
let isDragging = false;

function getStocks() {
  if (typeof localStorage.stocks === "undefined") {
    return DEFAULT_STOCKS.slice();
  }

  return localStorage.stocks
    .split(",")
    .map((stock) => stock.trim())
    .filter(Boolean);
}

function saveStocks(stocks) {
  localStorage.stocks = stocks.join(",");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function httpRequest(callback) {
  const stocks = getStocks();

  if (!stocks.length) {
    callback("");
    return;
  }

  chrome.runtime.sendMessage(
    { type: "fetch_stock", stocks: stocks.join(",") },
    (response) => {
      if (response && response.data) {
        callback(response.data);
      } else {
        console.error("Error fetching data:", response && response.error);
      }
    }
  );
}

function parseStockResult(result) {
  return result
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const parts = item.split("=");
      const code = parts[0].replace(/^v_/, "");
      const itemArr = parts[1].split('"')[1].split("~");
      const isUS = code.indexOf("$") !== -1;
      const curr = isUS
        ? Number(itemArr[1]).toFixed(2)
        : Number(itemArr[3]).toFixed(2);
      const yest = Number(itemArr[4]).toFixed(2);
      const range = isUS
        ? Number(itemArr[2]).toFixed(2)
        : (((curr - yest) / yest) * 100).toFixed(2);

      return {
        code,
        name: itemArr[1],
        price: curr,
        range,
      };
    });
}

function renderEmpty() {
  document.getElementById("stock").innerHTML =
    '<div class="empty">还没有关注的股票，先添加一个吧。</div>';
}

function showResult(result) {
  latestRows = result ? parseStockResult(result) : [];

  if (!latestRows.length) {
    renderEmpty();
    return;
  }

  const rows = latestRows
    .map((row) => {
      return `
        <tr draggable="true" data-code="${escapeHtml(row.code)}">
          <td class="drag-cell" title="拖动排序">::</td>
          <td class="name-cell">
            <span class="stock-name">${escapeHtml(row.name)}</span>
          </td>
          <td class="number-cell">${escapeHtml(row.price)}</td>
          <td class="range-cell">${escapeHtml(row.range)}</td>
          <td class="action-cell">
            <button class="delete-btn" type="button" data-code="${escapeHtml(
              row.code
            )}" title="删除">×</button>
          </td>
        </tr>`;
    })
    .join("");

  document.getElementById("stock").innerHTML = `
    <table>
      <tbody>${rows}</tbody>
    </table>`;

  bindListActions();
}

function refreshStocks(force) {
  if (isDragging && !force) {
    return;
  }

  httpRequest(showResult);
}

function removeStock(code) {
  const stocks = getStocks().filter((stock) => stock !== code);
  saveStocks(stocks);
  refreshStocks();
}

function persistCurrentTableOrder() {
  const rows = Array.from(document.querySelectorAll("tbody tr"));
  saveStocks(rows.map((row) => row.dataset.code));
}

function bindListActions() {
  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", () => removeStock(button.dataset.code));
  });

  let draggedRow = null;

  document.querySelectorAll("tbody tr").forEach((row) => {
    row.addEventListener("dragstart", () => {
      draggedRow = row;
      isDragging = true;
      row.classList.add("dragging");
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      draggedRow = null;
      isDragging = false;
      persistCurrentTableOrder();
      refreshStocks(true);
    });

    row.addEventListener("dragover", (event) => {
      event.preventDefault();

      if (!draggedRow || draggedRow === row) {
        return;
      }

      const rect = row.getBoundingClientRect();
      const shouldInsertAfter = event.clientY > rect.top + rect.height / 2;
      row.parentNode.insertBefore(
        draggedRow,
        shouldInsertAfter ? row.nextSibling : row
      );
    });
  });
}

document.getElementById("addBtn").onclick = function () {
  const add = document.getElementById("add");
  const addBtn = document.getElementById("addBtn");

  const form = document.createElement("div");
  form.className = "add-form";

  const input = document.createElement("input");
  input.type = "text";
  input.id = "newStock";
  input.placeholder = "如 sh600519 / sz000001";

  const saveBtn = document.createElement("input");
  saveBtn.type = "button";
  saveBtn.id = "saveBtn";
  saveBtn.value = "保存";

  const cancelBtn = document.createElement("input");
  cancelBtn.type = "button";
  cancelBtn.id = "cancelBtn";
  cancelBtn.value = "取消";

  form.appendChild(input);
  form.appendChild(saveBtn);
  form.appendChild(cancelBtn);
  add.replaceChild(form, addBtn);
  input.focus();

  function restoreAddButton() {
    add.replaceChild(addBtn, form);
  }

  saveBtn.onclick = function () {
    const newStock = input.value.trim();

    if (!newStock) {
      input.focus();
      return;
    }

    const stocks = getStocks();

    if (!stocks.includes(newStock)) {
      stocks.push(newStock);
      saveStocks(stocks);
    }

    refreshStocks();
    restoreAddButton();
  };

  cancelBtn.onclick = restoreAddButton;

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      saveBtn.click();
    }

    if (event.key === "Escape") {
      restoreAddButton();
    }
  });
};

(function () {
  refreshStocks();
  setInterval(refreshStocks, 1000);
})();
