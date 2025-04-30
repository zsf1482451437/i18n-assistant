// ===== 配置部分 - 可根据部署环境修改 =====
const CONFIG = {
  // 服务器配置 - 部署到远程服务器时修改这里
  SERVER: {
    PROTOCOL: "http",
    HOST: window.location.hostname, // 自动使用当前主机名
    PORT: window.location.port || 3000, // 自动使用当前端口或默认值
  },

  // API端点
  API_ENDPOINTS: {
    GET_TRANSLATIONS: "/api/translations",
    APPLY_TRANSLATIONS: "/api/apply-translations",
  },

  // 界面消息
  MESSAGES: {
    LOADING: "正在获取翻译数据...",
    NO_DATA: "没有可用的翻译数据",
    LOAD_FAILED: "加载翻译数据失败",
    DATA_LOADED: "已加载翻译数据",
    APPLYING: "开始添加翻译到命名空间",
    ERROR_NO_DATA: "错误: 没有可用的翻译数据",
    ERROR_NO_DIR: "错误: 请先输入项目目录",
    ERROR_NO_NAMESPACE: "错误: 请选择命名空间",
  },

  // UI配置
  UI: {
    SUCCESS_MESSAGE_TIMEOUT: 5000, // 成功消息显示时间(毫秒)
    ERROR_MESSAGE_TIMEOUT: 5000, // 错误消息显示时间(毫秒)
    LOG_MAX_ENTRIES: 100, // 日志最大条目数
  },

  // 预定义命名空间 - 服务器启动时会覆盖这个值
  PREDEFINED_NAMESPACES: [],
};
// ===== 配置部分结束 =====

// 构建API URL
function getApiUrl(endpoint) {
  return `${CONFIG.SERVER.PROTOCOL}://${CONFIG.SERVER.HOST}:${CONFIG.SERVER.PORT}${endpoint}`;
}

// 元素引用
const elements = {
  translationStatus: document.getElementById("translation-status"),
  translationData: document.getElementById("translation-data"),
  projectDirInput: document.getElementById("project-dir"),
  namespaceSelect: document.getElementById("namespace"),
  applyButton: document.getElementById("apply-translations"),
  refreshButton: document.getElementById("refresh-translations"),
  logContainer: document.getElementById("log-container"),
};

// 当前翻译数据
let currentTranslations = null;

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});

// 应用初始化
async function initializeApp() {
  try {
    // 首先加载预定义命名空间
    await loadPredefinedNamespaces();

    // 加载翻译数据
    await loadTranslations();

    // 设置事件监听器
    setupEventListeners();

    addLog("应用初始化完成");
  } catch (error) {
    addLog("初始化失败: " + error.message);
    console.error("初始化错误:", error);
  }
}

// 设置事件监听器
function setupEventListeners() {
  elements.applyButton.addEventListener("click", applyTranslations);
  elements.refreshButton.addEventListener("click", loadTranslations);

  // 监听目录输入变化
  elements.projectDirInput.addEventListener("input", updateButtonState);

  // 监听命名空间选择变化
  elements.namespaceSelect.addEventListener("change", updateButtonState);
}

// 更新应用按钮状态
function updateButtonState() {
  elements.applyButton.disabled =
    !currentTranslations ||
    !elements.namespaceSelect.value ||
    !elements.projectDirInput.value;
}

// 加载预定义的命名空间
async function loadPredefinedNamespaces() {
  try {
    const response = await fetch("/api/predefined-namespaces");
    const result = await response.json();

    if (result.success && Array.isArray(result.namespaces)) {
      CONFIG.PREDEFINED_NAMESPACES = result.namespaces;
      populateNamespaces(CONFIG.PREDEFINED_NAMESPACES);
      addLog(`已加载 ${CONFIG.PREDEFINED_NAMESPACES.length} 个命名空间`);
    } else {
      // 如果API请求失败，使用内置的命名空间列表
      populateNamespaces(CONFIG.PREDEFINED_NAMESPACES);
      addLog(`使用内置命名空间列表`);
    }
  } catch (error) {
    addLog("加载命名空间失败: " + error.message);
    // 错误时使用内置列表
    populateNamespaces(CONFIG.PREDEFINED_NAMESPACES);
  }
}

// 加载翻译数据
async function loadTranslations() {
  try {
    addLog(CONFIG.MESSAGES.LOADING);
    const response = await fetch(CONFIG.API_ENDPOINTS.GET_TRANSLATIONS);
    const result = await response.json();

    if (result.success) {
      currentTranslations = result.data;
      updateTranslationDisplay();
      addLog("成功加载翻译数据");
    } else {
      elements.translationStatus.textContent = CONFIG.MESSAGES.NO_DATA;
      elements.translationData.textContent = "";
      addLog("警告: " + result.error);
    }
  } catch (error) {
    elements.translationStatus.textContent = CONFIG.MESSAGES.LOAD_FAILED;
    elements.translationData.textContent = "";
    addLog("错误: " + error.message);
  }
}

// 更新翻译数据显示
function updateTranslationDisplay() {
  if (currentTranslations) {
    elements.translationStatus.textContent = CONFIG.MESSAGES.DATA_LOADED;
    elements.translationData.textContent = JSON.stringify(
      currentTranslations,
      null,
      2
    );
    updateButtonState();
  } else {
    elements.translationStatus.textContent = CONFIG.MESSAGES.NO_DATA;
    elements.translationData.textContent = "";
    elements.applyButton.disabled = true;
  }
}

// 填充命名空间下拉菜单
function populateNamespaces(namespaces) {
  // 保留第一个"请选择命名空间"选项
  elements.namespaceSelect.innerHTML =
    '<option value="">请选择命名空间</option>';

  namespaces.forEach((namespace) => {
    const option = document.createElement("option");
    option.value = namespace;
    option.textContent = namespace;
    elements.namespaceSelect.appendChild(option);
  });
}

// 应用翻译
async function applyTranslations() {
  try {
    if (!currentTranslations) {
      addLog("错误: " + CONFIG.MESSAGES.ERROR_NO_DATA);
      return;
    }

    if (!elements.projectDirInput.value) {
      addLog("错误: " + CONFIG.MESSAGES.ERROR_NO_DIR);
      return;
    }

    if (!elements.namespaceSelect.value) {
      addLog("错误: " + CONFIG.MESSAGES.ERROR_NO_NAMESPACE);
      return;
    }

    addLog(`开始添加翻译到命名空间 ${elements.namespaceSelect.value}...`);

    const response = await fetch(CONFIG.API_ENDPOINTS.APPLY_TRANSLATIONS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectDir: elements.projectDirInput.value,
        namespace: elements.namespaceSelect.value,
        translations: currentTranslations,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // 显示详细的成功信息
      addLog(`✅ ${result.message}`);

      // 显示文件列表
      addLog(`修改的文件:`);
      result.modifiedFiles.forEach((file) => {
        addLog(`  ↳ ${file}`);
      });

      // 如果有详细信息，展示更多内容
      if (result.details) {
        const { namespace, languages, exampleKey, exampleText } =
          result.details;
        addLog(`命名空间: ${namespace}`);
        addLog(`包含的语言: ${languages.join(", ")}`);
        if (exampleKey) {
          addLog(`添加的翻译示例: "${exampleKey}": "${exampleText}"`);
        }
      }

      // 在UI上显示成功消息
      showSuccessMessage(result.message);
    } else {
      addLog("错误: " + result.error);
      showErrorMessage(result.error);
    }
  } catch (error) {
    addLog("错误: " + error.message);
    showErrorMessage(error.message);
  }
}

// 显示成功消息
function showSuccessMessage(message) {
  // 创建一个临时的成功消息元素
  const messageDiv = document.createElement("div");
  messageDiv.className = "success-message";
  messageDiv.textContent = message;

  // 添加到页面
  document.body.appendChild(messageDiv);

  // 设定时间后自动移除
  setTimeout(() => {
    messageDiv.classList.add("fade-out");
    setTimeout(() => {
      if (document.body.contains(messageDiv)) {
        document.body.removeChild(messageDiv);
      }
    }, 500);
  }, CONFIG.UI.SUCCESS_MESSAGE_TIMEOUT);
}

// 显示错误消息
function showErrorMessage(message) {
  // 创建一个临时的错误消息元素
  const messageDiv = document.createElement("div");
  messageDiv.className = "error-message";
  messageDiv.textContent = message;

  // 添加到页面
  document.body.appendChild(messageDiv);

  // 设定时间后自动移除
  setTimeout(() => {
    messageDiv.classList.add("fade-out");
    setTimeout(() => {
      if (document.body.contains(messageDiv)) {
        document.body.removeChild(messageDiv);
      }
    }, 500);
  }, CONFIG.UI.ERROR_MESSAGE_TIMEOUT);
}

// 添加日志
function addLog(message) {
  const logEntry = document.createElement("div");
  logEntry.className = "log-entry";

  const timestamp = new Date().toLocaleTimeString();
  logEntry.textContent = `[${timestamp}] ${message}`;

  elements.logContainer.appendChild(logEntry);
  elements.logContainer.scrollTop = elements.logContainer.scrollHeight;

  // 限制日志条目数量，防止内存占用过高
  const logEntries = elements.logContainer.querySelectorAll(".log-entry");
  if (logEntries.length > CONFIG.UI.LOG_MAX_ENTRIES) {
    elements.logContainer.removeChild(logEntries[0]);
  }
}
