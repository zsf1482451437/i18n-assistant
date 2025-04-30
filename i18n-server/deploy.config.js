// deploy.config.js - 部署配置文件
module.exports = {
  // 开发环境配置
  development: {
    PORT: 3000,
    HOST: "localhost",
    AUTO_OPEN_BROWSER: true,
    TEMP_TRANSLATIONS_FILE: "temp-translations.json",
    UPLOADS_DIR: "uploads",
  },

  // 测试环境配置
  testing: {
    PORT: 3001,
    HOST: "localhost",
    AUTO_OPEN_BROWSER: false,
    TEMP_TRANSLATIONS_FILE: "temp-translations.json",
    UPLOADS_DIR: "uploads",
  },

  // 生产环境配置
  production: {
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || "0.0.0.0", // 使用0.0.0.0监听所有网络接口
    AUTO_OPEN_BROWSER: false,
    TEMP_TRANSLATIONS_FILE: "temp-translations.json",
    UPLOADS_DIR: "/var/i18n-server/uploads", // 生产环境可能使用绝对路径
  },
};
