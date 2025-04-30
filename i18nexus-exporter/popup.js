let elements;

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  // 获取页面元素
  elements = {
    extractBtn: document.getElementById("extractBtn"),
    status: document.getElementById("status"),
  };

  // 绑定事件
  elements.extractBtn.addEventListener("click", extractAndSendToServer);
});

// 提取翻译并发送到本地服务器
async function extractAndSendToServer() {
  try {
    elements.status.textContent = CONFIG.MESSAGES.EXTRACTING;
    elements.status.className = "info";
    elements.extractBtn.disabled = true;

    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    // 向内容脚本发送消息
    const result = await chrome.tabs.sendMessage(tab.id, {
      action: "extractTranslations",
    });

    if (!result || !result.success) {
      throw new Error(result?.error || CONFIG.MESSAGES.ERROR_EXTRACT_FAILED);
    }

    // 获取提取的翻译数据
    const translationData = result.data;
    console.log("提取的翻译数据:", translationData);

    // 发送到本地服务器
    elements.status.textContent = CONFIG.MESSAGES.SENDING;
    elements.status.className = "info";

    const response = await fetch(
      `${CONFIG.SERVER_URL}${CONFIG.API_ENDPOINTS.RECEIVE_TRANSLATIONS}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(translationData),
      }
    );

    const responseData = await response.json();

    if (!responseData.success) {
      throw new Error(responseData.error || CONFIG.MESSAGES.ERROR_SEND_FAILED);
    }

    elements.status.textContent = CONFIG.MESSAGES.SUCCESS;
    elements.status.className = "success";
    elements.extractBtn.disabled = false;
  } catch (error) {
    console.error("提取翻译错误:", error);
    elements.status.textContent = `错误: ${error.message}`;
    elements.status.className = "error";
    elements.extractBtn.disabled = false;
  }
}
