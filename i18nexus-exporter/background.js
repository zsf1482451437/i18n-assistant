chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadTranslations") {
    try {
      console.log("接收到下载请求，数据:", request.data);

      // 确保数据存在并格式正确
      if (!request.data || !request.data.translations) {
        throw new Error("数据不完整或格式不正确");
      }

      const { translations } = request.data;
      const filesCount = downloadTranslationFiles(translations);
      sendResponse({ success: true, count: filesCount });
    } catch (error) {
      console.error("下载处理错误:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // 异步响应需要返回true
  }
});

function downloadTranslationFiles(translations) {
  console.log("准备下载的翻译:", translations);

  // 确保translations是一个有效对象
  if (!translations || typeof translations !== "object") {
    throw new Error("翻译数据无效");
  }

  let count = 0;

  Object.entries(translations).forEach(([langCode, translation]) => {
    // 创建包含翻译内容的对象
    const translationData = {
      test: translation,
    };

    // 转换为JSON字符串
    const jsonContent = JSON.stringify(translationData, null, 2);

    // 创建Blob对象
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = "data:application/json;base64," + btoa(jsonContent);

    // 下载文件
    chrome.downloads.download({
      url: url,
      filename: `${langCode}.json`,
      saveAs: false,
    });

    count++;
  });

  return count;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("扩展已安装");
});

// 可能需要添加消息中继
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return true;
});
