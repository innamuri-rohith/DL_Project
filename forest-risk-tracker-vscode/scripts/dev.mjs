import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const pnpmCmd = isWindows ? "pnpm.cmd" : "pnpm";

console.log("==================================================");
console.log("🌲 Starting Forest Risk & Wildlife Tracker");
console.log("==================================================");

const apiProcess = spawn(pnpmCmd, ["--filter", "@workspace/api-server", "run", "dev"], {
  stdio: "inherit",
  shell: isWindows,
  env: {
    ...process.env,
    PORT: process.env.PORT || "5000",
  },
});

const webProcess = spawn(pnpmCmd, ["--filter", "@workspace/forest-risk-tracker", "run", "dev"], {
  stdio: "inherit",
  shell: isWindows,
  env: {
    ...process.env,
    PORT: process.env.WEB_PORT || "3000",
    BASE_PATH: "/",
    API_URL: "http://127.0.0.1:5000",
  },
});

function cleanup() {
  console.log("\nStopping processes...");
  if (isWindows) {
    if (apiProcess.pid) spawn("taskkill", ["/pid", apiProcess.pid.toString(), "/f", "/t"]);
    if (webProcess.pid) spawn("taskkill", ["/pid", webProcess.pid.toString(), "/f", "/t"]);
  } else {
    apiProcess.kill();
    webProcess.kill();
  }
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});
