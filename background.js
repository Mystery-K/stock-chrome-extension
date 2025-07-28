chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "fetch_stock") {
    const stocks = message.stocks || "sh000001";
    const url = "http://qt.gtimg.cn/q=" + stocks;

    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        const decoder = new TextDecoder("gb18030"); // 或 "gbk"
        const data = decoder.decode(buffer);
        sendResponse({ data });
      })
      .catch((err) => sendResponse({ error: err.toString() }));

    return true; // 表示异步 sendResponse
  }
});