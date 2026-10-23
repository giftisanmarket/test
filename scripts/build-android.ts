import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const possibleJdks = [
  process.env.JAVA_HOME,
  "C:\\Program Files\\Android\\Android Studio\\jbr",
  "C:\\Program Files\\Java",
  "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
  "/usr/lib/jvm/default-java"
];

let jdkPath = possibleJdks.find((p) => p && fs.existsSync(p));

const possibleAndroidSdks = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk"),
  "C:\\Users\\hazem\\AppData\\Local\\Android\\Sdk",
  path.join(process.env.HOME || "", "Library", "Android", "sdk"),
];
let sdkPath = possibleAndroidSdks.find((p) => p && fs.existsSync(p));

const env = { ...process.env };
if (jdkPath) {
  env.JAVA_HOME = jdkPath;
  const binDir = path.join(jdkPath, "bin");
  env.PATH = `${binDir}${path.delimiter}${env.PATH || env.Path || ""}`;
  env.Path = env.PATH;
}
if (sdkPath) {
  env.ANDROID_HOME = sdkPath;
  env.ANDROID_SDK_ROOT = sdkPath;
}

const isWin = process.platform === "win32";
const gradlewCmd = isWin ? ".\\gradlew.bat" : "./gradlew";
const target = process.argv[2] || "bundleRelease";

console.log(`Using JAVA_HOME: ${env.JAVA_HOME || "(default system)"}`);
console.log(`Using ANDROID_HOME: ${env.ANDROID_HOME || "(default system)"}`);
console.log(`Running Gradle target: ${target}`);

// Production safety check: prevent baking local IP dev server into release builds
if (target.toLowerCase().includes("release")) {
  const configJsonPath = path.resolve("android/app/src/main/assets/capacitor.config.json");
  if (fs.existsSync(configJsonPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configJsonPath, "utf-8"));
      const currentUrl = config?.server?.url || "";
      if (
        currentUrl.includes("localhost") ||
        currentUrl.includes("192.168.") ||
        currentUrl.includes("10.0.2.") ||
        currentUrl.includes("127.0.0.1")
      ) {
        console.warn(`\n[WARNING] Found local dev URL (${currentUrl}) in capacitor.config.json for release target.`);
        console.log(`Resetting server.url to https://www.giftisan.com for ${target}...`);
        config.server.url = "https://www.giftisan.com";
        fs.writeFileSync(configJsonPath, JSON.stringify(config, null, "\t"));
        console.log("Safe production URL restored.");
      }
    } catch (e) {
      console.warn("Could not check capacitor.config.json:", e);
    }
  }
}

try {
  execSync(`${gradlewCmd} ${target}`, {
    cwd: path.resolve("android"),
    stdio: "inherit",
    env,
  });
  console.log(`\nSuccessfully built Android target: ${target}!`);
} catch (err) {
  console.error(`\nFailed to build Android target: ${target}`, err);
  process.exit(1);
}
