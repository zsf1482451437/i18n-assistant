const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs-extra");
const path = require("path"); // 确保path模块在使用前引入
const { exec } = require("child_process");
const http = require("http");
const multer = require("multer");

// 然后加载环境配置
const deployConfig = require("./deploy.config");
const env = process.env.NODE_ENV || "development";
const envConfig = deployConfig[env];

// 验证环境配置
if (!envConfig) {
  console.error(`错误: 找不到环境 '${env}' 的配置`);
  process.exit(1);
}

// ===== 配置部分 - 整合环境配置 =====
const CONFIG = {
  // 服务器配置
  PORT: process.env.PORT || envConfig.PORT || 3000,
  HOST: process.env.HOST || envConfig.HOST || "localhost",

  // 文件路径配置
  TEMP_TRANSLATIONS_FILE:
    envConfig.TEMP_TRANSLATIONS_FILE || "temp-translations.json",
  UPLOADS_DIR: path.resolve(__dirname, envConfig.UPLOADS_DIR || "uploads"),
  PUBLIC_DIR: path.join(__dirname, "public"),

  // API端点
  API_ENDPOINTS: {
    RECEIVE_TRANSLATIONS: "/api/receive-translations",
    GET_TRANSLATIONS: "/api/translations",
    ANALYZE_DIRECTORY: "/api/analyze-directory",
    APPLY_TRANSLATIONS: "/api/apply-translations",
  },

  // 自动打开浏览器配置
  AUTO_OPEN_BROWSER:
    envConfig.AUTO_OPEN_BROWSER !== undefined
      ? envConfig.AUTO_OPEN_BROWSER
      : env === "development",

  // 预定义的命名空间列表
  NAMESPACES: [
    "accountHelp",
    "address",
    "affiliateProgram",
    "blog",
    "category",
    "cc",
    "changePassword",
    "clubAndNation",
    "comment",
    "commentList",
    "common",
    "couponCenter",
    "couponDetail",
    "couponOrder",
    "creatorsClub",
    "customPage",
    "defaultLayout",
    "dropshipping",
    "error",
    "faq",
    "flashDeals",
    "GCoupon",
    "globalTranslate",
    "index",
    "influencerProgram",
    "invoice",
    "memberAddress",
    "mineAddress",
    "mineCoupons",
    "mineEarnPoints",
    "mineHome",
    "mineInvitationPlan",
    "mineLayout",
    "mineMembership",
    "mineMessage",
    "mineOrders",
    "minePoints",
    "mineProfile",
    "mineShippingDetail",
    "mineTopup",
    "mineWallet",
    "mineWishlist",
    "orderSummary",
    "payChannel",
    "pointShop",
    "productDetail",
    "productReview",
    "referAFriend",
    "referralProgram",
    "registerGround",
    "removeAccount",
    "repassword",
    "search",
    "searchNav",
    "shipping",
    "sitemap",
    "team",
    "trackOrder",
    "transfer",
    "useFilterCouponTitle",
    "userLogin",
    "useValidateErrorMsg",
    "videoComment",
    "videoCommentDetail",
    "videoCommentList",
    "workOrder",
  ],
};

// 创建Express应用
const app = express();

// 中间件
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.static(CONFIG.PUBLIC_DIR));

// 创建上传目录
fs.ensureDirSync(CONFIG.UPLOADS_DIR);

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 根据文件的相对路径创建目录结构
    const relativePath = path.dirname(file.originalname);
    const targetDir = path.join(CONFIG.UPLOADS_DIR, relativePath);
    fs.ensureDirSync(targetDir);
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    // 使用原始文件名
    cb(null, path.basename(file.originalname));
  },
});

const upload = multer({ storage: storage });

// API路由
app.post(CONFIG.API_ENDPOINTS.RECEIVE_TRANSLATIONS, (req, res) => {
  try {
    const newTranslations = req.body;
    const filePath = path.join(__dirname, CONFIG.TEMP_TRANSLATIONS_FILE);

    // 检查是否存在现有翻译数据
    let existingData = { translations: {} };
    if (fs.existsSync(filePath)) {
      try {
        existingData = fs.readJsonSync(filePath);
      } catch (parseError) {
        console.error("解析现有翻译文件错误:", parseError);
        // 解析错误时使用空对象继续
      }
    }

    // 合并新旧翻译数据
    const mergedTranslations = mergeTranslations(existingData, newTranslations);

    // 保存到临时文件
    fs.writeJsonSync(filePath, mergedTranslations, { spaces: 2 });

    res.json({
      success: true,
      message: "翻译数据已追加",
      added: Object.keys(newTranslations.translations || {}).length,
    });
  } catch (error) {
    console.error("接收翻译数据错误:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取翻译数据
app.get(CONFIG.API_ENDPOINTS.GET_TRANSLATIONS, (req, res) => {
  try {
    const filePath = path.join(__dirname, CONFIG.TEMP_TRANSLATIONS_FILE);
    if (fs.existsSync(filePath)) {
      const data = fs.readJsonSync(filePath);
      res.json({ success: true, data });
    } else {
      res.json({ success: false, error: "没有可用的翻译数据" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 分析目录结构
app.post(CONFIG.API_ENDPOINTS.ANALYZE_DIRECTORY, (req, res) => {
  try {
    const { dirPath } = req.body;
    if (!dirPath) {
      return res.status(400).json({ success: false, error: "缺少目录路径" });
    }

    const result = analyzeDirectory(dirPath);
    res.json({
      success: true,
      namespaces: result.namespaces,
      totalFiles: result.totalFiles,
    });
  } catch (error) {
    console.error("分析目录错误:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 应用翻译
app.post(CONFIG.API_ENDPOINTS.APPLY_TRANSLATIONS, (req, res) => {
  try {
    const { projectDir, namespace, translations } = req.body;

    if (!projectDir || !namespace || !translations) {
      return res.status(400).json({
        success: false,
        error: "缺少必要参数：需要项目目录、命名空间和翻译数据",
      });
    }

    // 提取翻译中包含的语言
    const languages = Object.keys(translations.translations || {});

    // 获取第一个语言的第一个键作为示例
    let exampleKey = "";
    let exampleSourceText = "";

    if (languages.length > 0) {
      const firstLang = languages[0];
      const firstLangTranslations = translations.translations[firstLang];

      if (firstLangTranslations && typeof firstLangTranslations === "object") {
        const keys = Object.keys(firstLangTranslations);
        if (keys.length > 0) {
          exampleKey = keys[0];
          exampleSourceText = firstLangTranslations[keys[0]];
        }
      }
    }

    const result = applyTranslationsToNamespace(
      projectDir,
      namespace,
      translations
    );

    // 添加更详细的成功信息
    res.json({
      success: true,
      ...result,
      message: `已成功添加翻译！翻译已添加到 ${result.modifiedCount} 个语言文件的顶部。`,
      details: {
        namespace: namespace,
        languages: languages,
        exampleKey: exampleKey,
        exampleText: exampleSourceText,
      },
    });
  } catch (error) {
    console.error("应用翻译错误:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取预定义命名空间的端点
app.get("/api/predefined-namespaces", (req, res) => {
  res.json({ success: true, namespaces: CONFIG.NAMESPACES });
});

// 启动服务器
const server = app.listen(CONFIG.PORT, () => {
  const serverUrl = `http://${
    CONFIG.HOST === "localhost" ? "localhost" : CONFIG.HOST
  }:${CONFIG.PORT}`;

  // 自动打开浏览器（如果配置为true）
  if (CONFIG.AUTO_OPEN_BROWSER) {
    const url = serverUrl;
    let command;

    switch (process.platform) {
      case "win32":
        command = `start ${url}`;
        break;
      case "darwin":
        command = `open ${url}`;
        break;
      default:
        command = `xdg-open ${url}`;
    }

    exec(command);
  }
});

// 添加上传目录的API端点
app.post("/api/upload-directory", upload.array("files"), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: "没有上传文件" });
    }

    // 获取上传文件的根目录
    const firstFilePath = req.files[0].originalname;
    const rootDirName = firstFilePath.split("/")[0];
    const serverPath = path.join(CONFIG.UPLOADS_DIR, rootDirName);

    res.json({
      success: true,
      message: `成功上传 ${req.files.length} 个文件`,
      serverPath: serverPath,
    });
  } catch (error) {
    console.error("上传目录错误:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 分析目录结构
function analyzeDirectory(dirPath) {
  const namespaces = new Set();
  const files = [];
  let totalFiles = 0;

  // 递归扫描目录
  function scanDir(currentPath, relativePath = "") {
    try {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // 跳过备份目录
          if (item === "_backups") continue;

          // 递归扫描子目录
          scanDir(fullPath, path.join(relativePath, item));
        } else if (item.endsWith(".json")) {
          // 是JSON文件，尝试提取命名空间
          totalFiles++;
          const namespace = path.basename(item, ".json");
          namespaces.add(namespace);

          // 添加到文件列表
          files.push({
            path: fullPath,
            relativePath: path.join(relativePath, item),
            language: path.basename(path.dirname(fullPath)),
            namespace,
          });
        }
      }
    } catch (error) {
      console.error(`扫描目录 ${currentPath} 错误:`, error);
    }
  }

  scanDir(dirPath);

  return {
    namespaces: Array.from(namespaces),
    totalFiles,
    files,
  };
}

// 应用翻译到命名空间函数
function applyTranslationsToNamespace(dirPath, namespace, translationData) {
  let modifiedCount = 0;
  const modifiedFiles = [];

  // 获取翻译信息
  const translations = translationData.translations || {};

  // 为每种语言更新对应文件
  for (const langCode in translations) {
    // 使用原始语言代码作为目录名
    const localLangDir = langCode;

    // 构建文件路径
    const langDir = path.join(dirPath, localLangDir);
    const filePath = path.join(langDir, `${namespace}.json`);

    try {
      // 检查目录是否存在，不存在则创建
      if (!fs.existsSync(langDir)) {
        console.log(`创建语言目录: ${langDir}`);
        fs.mkdirSync(langDir, { recursive: true });
      }

      let jsonData = {};

      // 检查文件是否存在
      if (fs.existsSync(filePath)) {
        // 读取并解析现有文件
        try {
          const content = fs.readFileSync(filePath, "utf8");
          jsonData = JSON.parse(content);
        } catch (parseError) {
          console.error(`解析文件失败 ${filePath}:`, parseError);
          jsonData = {}; // 如果解析失败，使用空对象
        }
      }

      // 应用翻译 - 添加新的键值对
      let modified = addTranslation(jsonData, translations[langCode]);

      if (modified) {
        // 写回文件
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), "utf8");
        modifiedCount++;
        modifiedFiles.push(`${localLangDir}/${namespace}.json`);
      }
    } catch (error) {
      console.error(`处理语言 ${langCode} 错误:`, error);
    }
  }

  return {
    modifiedCount,
    modifiedFiles,
  };
}

// 添加翻译到JSON，在顶部添加而非底部
function addTranslation(data, translation) {
  // 如果是字符串，直接添加到第一个位置
  if (typeof translation === "string") {
    // 生成一个新的键名
    let newKey = `translation_${Object.keys(data).length + 1}`;

    // 添加到顶部：创建一个新对象，将新键值对放在第一位
    const newData = { [newKey]: translation };

    // 将原有数据合并到新对象中
    Object.assign(newData, data);

    // 将合并后的结果复制回原对象
    Object.keys(data).forEach((key) => {
      delete data[key];
    });

    Object.keys(newData).forEach((key) => {
      data[key] = newData[key];
    });

    return true;
  }

  // 如果是对象，将新键添加到顶部
  if (typeof translation === "object" && translation !== null) {
    let modified = false;

    // 获取要添加的所有新键
    const newKeys = Object.keys(translation).filter(
      (key) => data[key] === undefined
    );

    if (newKeys.length > 0) {
      // 创建一个新对象，先放入所有新键
      const newData = {};

      // 添加所有新键到顶部
      newKeys.forEach((key) => {
        newData[key] = translation[key];
      });

      // 然后添加原有键
      Object.keys(data).forEach((key) => {
        newData[key] = data[key];
      });

      // 清空原对象并复制回去
      Object.keys(data).forEach((key) => {
        delete data[key];
      });

      Object.keys(newData).forEach((key) => {
        data[key] = newData[key];
      });

      modified = true;
    }

    // 处理现有的嵌套对象
    for (const key in translation) {
      if (
        data[key] !== undefined &&
        typeof data[key] === "object" &&
        typeof translation[key] === "object"
      ) {
        // 递归处理嵌套对象
        const nestedModified = addTranslation(data[key], translation[key]);
        modified = modified || nestedModified;
      }
    }

    return modified;
  }

  return false;
}

// 添加合并翻译的辅助函数
function mergeTranslations(existingData, newData) {
  // 确保数据结构正确
  const existing = existingData.translations || {};
  const newTranslations = newData.translations || {};
  const result = { translations: { ...existing } };

  // 遍历每种语言
  for (const langCode in newTranslations) {
    // 如果这种语言在现有数据中不存在，直接添加
    if (!result.translations[langCode]) {
      result.translations[langCode] = newTranslations[langCode];
      continue;
    }

    // 如果语言存在，合并对象
    result.translations[langCode] = {
      ...newTranslations[langCode], // 新翻译放在前面，优先级更高
      ...result.translations[langCode], // 已有翻译
    };
  }

  return result;
}
