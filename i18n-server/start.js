const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// 配置信息
const CONFIG = {
  // 服务器信息
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || "localhost",

  // 日志文件
  LOG_FILE: path.join(__dirname, "server.log"),

  // 是否在后台运行
  RUN_IN_BACKGROUND: process.env.RUN_IN_BACKGROUND === "true",

  // Node.js命令
  NODE_CMD: process.platform === "win32" ? "node" : "nodejs",
};

// 写入日志
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  console.log(message);
  fs.appendFileSync(CONFIG.LOG_FILE, logMessage);
}

// 启动服务器
function startServer() {
  // 构建启动命令
  const command = `${CONFIG.NODE_CMD} server.js`;

  // 设置环境变量
  const env = {
    ...process.env,
    PORT: CONFIG.PORT,
    HOST: CONFIG.HOST,
  };

  // 执行命令
  const serverProcess = exec(command, { env });

  // 处理输出
  serverProcess.stdout.on("data", (data) => {
    log(`[服务器输出] ${data.trim()}`);
  });

  serverProcess.stderr.on("data", (data) => {
    log(`[服务器错误] ${data.trim()}`);
  });

  serverProcess.on("close", (code) => {
    log(`服务器进程退出，代码: ${code}`);
  });

  // 如果不是后台运行，将进程输出连接到当前控制台
  if (!CONFIG.RUN_IN_BACKGROUND) {
    serverProcess.stdout.pipe(process.stdout);
    serverProcess.stderr.pipe(process.stderr);
  }

  return serverProcess;
}

// 主函数
function main() {
  try {
    // 检查服务器文件是否存在
    if (!fs.existsSync(path.join(__dirname, "server.js"))) {
      log("错误: 找不到server.js文件");
      process.exit(1);
    }

    // 确保uploads目录存在
    const uploadsDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      log("创建uploads目录");
      fs.mkdirSync(uploadsDir);
    }

    // 启动服务器
    const serverProcess = startServer();

    // 处理进程退出
    process.on("SIGINT", () => {
      log("收到中断信号，正在关闭服务器...");
      serverProcess.kill();
      process.exit(0);
    });
  } catch (error) {
    log(`启动错误: ${error.message}`);
    process.exit(1);
  }
}

// 运行主函数
main();
