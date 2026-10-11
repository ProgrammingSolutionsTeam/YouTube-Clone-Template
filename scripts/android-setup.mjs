// Run after `npx cap add android`: adds storage/media permissions, app version
// and description to the generated Android project. Safe to run repeatedly.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const manifestPath = "android/app/src/main/AndroidManifest.xml";
const gradlePath = "android/app/build.gradle";
const stringsPath = "android/app/src/main/res/values/strings.xml";

if (!existsSync(manifestPath)) {
  console.error("android/ not found — run `npx cap add android` first.");
  process.exit(1);
}

const PERMISSIONS = [
  '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
  '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_VISUAL_USER_SELECTED" />',
  '<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />',
  '<uses-permission android:name="android.permission.INTERNET" />',
  '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
  '<uses-permission android:name="android.permission.WAKE_LOCK" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />',
];

let manifest = readFileSync(manifestPath, "utf8");
const missing = PERMISSIONS.filter((p) => !manifest.includes(p.match(/name="([^"]+)"/)[1] + '"'));
if (missing.length) manifest = manifest.replace("</manifest>", `    ${missing.join("\n    ")}\n</manifest>`);
if (!manifest.includes("requestLegacyExternalStorage"))
  manifest = manifest.replace("<application", '<application\n        android:requestLegacyExternalStorage="true"\n        android:usesCleartextTraffic="true"');
writeFileSync(manifestPath, manifest);

const [maj = 1, min = 0, pat = 0] = String(pkg.version).split(".").map(Number);
let gradle = readFileSync(gradlePath, "utf8");
gradle = gradle
  .replace(/versionCode \d+/, `versionCode ${maj * 10000 + min * 100 + pat}`)
  .replace(/versionName "[^"]*"/, `versionName "${pkg.version}"`);
writeFileSync(gradlePath, gradle);

mkdirSync("android/app/src/main/res/values", { recursive: true });
let strings = existsSync(stringsPath) ? readFileSync(stringsPath, "utf8") : "<resources>\n</resources>";
if (!strings.includes("app_description"))
  strings = strings.replace(
    "</resources>",
    '    <string name="app_description">LocalTube — منصة فيديو محلية شبيهة بيوتيوب لتشغيل ملفات الفيديو والصوت من جهازك، بدون إنترنت وبخصوصية كاملة.</string>\n</resources>',
  );
writeFileSync(stringsPath, strings);

console.log(`LocalTube Android ready: v${pkg.version}, ${PERMISSIONS.length} permissions.`);
