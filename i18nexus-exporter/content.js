// 监听来自popup或background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractTranslations") {
    try {
      const result = extractTranslations();
      console.log("提取的翻译数据:", result); // 调试用
      sendResponse({ success: true, data: result });
    } catch (error) {
      console.error("提取翻译时出错:", error); // 调试用
      sendResponse({ success: false, error: error.message });
    }
    return true; // 异步响应需要返回true
  }
});

// 提取翻译的函数
function extractTranslations() {
  // 提取语言代码
  const languageCodes = Array.from(
    document.querySelectorAll(
      'div[class*="translationsTableRow"] span[class*="code"]'
    )
  ).map((element) => element.textContent.replace(/[()]/g, ""));

  // 获取源文本(英文) - 更准确的方法
  let sourceText = "";

  // 1. 找到包含chevron-down图标的toggleWrapper元素
  const toggleWrapper = document
    .querySelector('div[class*="toggleWrapper"] i[class*="fa-chevron-down"]')
    ?.closest('div[class*="toggleWrapper"]');

  // 2. 如果找到toggleWrapper，获取它的下一个兄弟元素中的iconWithText
  if (toggleWrapper) {
    const nextSibling = toggleWrapper.nextElementSibling;
    if (nextSibling) {
      const iconWithTextElement = nextSibling.querySelector(
        'div[class*="iconWithText"]'
      );
      if (iconWithTextElement) {
        sourceText = iconWithTextElement.textContent.trim();
        console.log("从toggleWrapper的下一个兄弟元素找到的源文本:", sourceText);
      }
    }
  }

  // 如果上面的方法失败，尝试直接查找iconWithText（备用方法）
  if (!sourceText) {
    const iconWithTextElement = document.querySelector(
      'div[class*="iconWithText"]'
    );
    if (iconWithTextElement) {
      sourceText = iconWithTextElement.textContent.trim();
      console.log("直接查找到的iconWithText源文本:", sourceText);
    }
  }

  // 最后备用：如果以上方法都失败，尝试获取主行的valueText
  if (!sourceText) {
    const sourceTextElement = document.querySelector(
      'span[class*="valueText"]:not([dir="auto"])'
    );
    sourceText = sourceTextElement ? sourceTextElement.textContent.trim() : "";
    console.log("从valueText获取的备用源文本:", sourceText);
  }

  // 从translationsTableRow下提取翻译值
  const translationValues = Array.from(
    document.querySelectorAll(
      'div[class*="translationsTableRow"] span[class*="valueText"]'
    )
  ).map((element) => element.textContent);

  console.log("提取的翻译值:", translationValues);

  // 生成有效的键名 - 使用源文本(英文)作为键名
  // 对源文本进行处理，确保它是一个有效的对象键
  let translationKey = sourceText;

  // 为了安全，可以稍微处理一下源文本，确保它是有效的键名
  // 如果源文本太长，可以截取一部分
  if (translationKey.length > 40) {
    translationKey = translationKey.substring(0, 40) + "...";
  }

  // 合并为对象
  const translations = {};

  // 确保添加英文翻译，使用源文本作为键名
  translations["en"] = {
    [sourceText]: sourceText,
  };

  // 添加其他语言的翻译，使用源文本作为键名
  languageCodes.forEach((code, index) => {
    if (index < translationValues.length) {
      translations[code] = {
        [sourceText]: translationValues[index],
      };
    }
  });

  console.log("语言代码:", languageCodes);
  console.log("源文本(英文):", sourceText);
  console.log("翻译值:", translationValues);
  console.log("合并结果:", translations);

  // 确保translations不为空
  if (Object.keys(translations).length <= 1) {
    // 只有英文也算是空
    throw new Error("未找到任何翻译数据");
  }

  return { translations };
}
