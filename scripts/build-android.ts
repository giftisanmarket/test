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
