import fs from "node:fs/promises";
import path from "node:path";

const appName = (process.env.APP_NAME || "My Website").trim();
const packageId = (process.env.PACKAGE_ID || "com.example.mywebsite").trim();
const websiteUrl = (process.env.WEBSITE_URL || "").trim();
const theme = (process.env.APP_THEME || "light").trim();

if (appName.length < 2 || appName.length > 32 || /[<>]/.test(appName)) {
  throw new Error("App name must be 2–32 characters and cannot contain angle brackets.");
}
if (!/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*){1,5}$/.test(packageId)) {
  throw new Error("Invalid package ID. Example: com.example.mywebsite");
}
let parsed;
try { parsed = new URL(websiteUrl); } catch { throw new Error("Enter a valid website URL."); }
if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
  throw new Error("Only public HTTPS website URLs are supported.");
}
if (theme !== "light" && theme !== "dark") throw new Error("Theme must be light or dark.");
const host = parsed.hostname.toLowerCase();
if (["localhost", "127.0.0.1", "::1"].includes(host) || host.endsWith(".local") ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
  throw new Error("Local and private network URLs are not allowed.");
}

const root = path.resolve("android-project");
const app = path.join(root, "app");
const java = path.join(app, "src/main/java", ...packageId.split("."));
const values = path.join(app, "src/main/res/values");
await fs.mkdir(java, { recursive: true });
await fs.mkdir(values, { recursive: true });

const xml = s => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const javaString = s => s.replaceAll("\\", "\\\\").replaceAll('"', '\\"')
  .replaceAll("\n", "\\n").replaceAll("\r", "");

await fs.writeFile(path.join(root, "settings.gradle"), `
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
  repositories { google(); mavenCentral() }
}
rootProject.name = "WebsiteApp"
include(":app")
`);
await fs.writeFile(path.join(root, "build.gradle"), `
plugins { id "com.android.application" version "8.6.1" apply false }
`);
await fs.writeFile(path.join(root, "gradle.properties"),
  "org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\n");
await fs.writeFile(path.join(app, "build.gradle"), `
plugins { id "com.android.application" }
android {
  namespace "${packageId}"
  compileSdk 35
  defaultConfig {
    applicationId "${packageId}"
    minSdk 23
    targetSdk 35
    versionCode 1
    versionName "1.0"
  }
}
`);
await fs.writeFile(path.join(values, "strings.xml"),
  `<?xml version="1.0" encoding="utf-8"?><resources><string name="app_name">${xml(appName)}</string></resources>`);
const dark = theme === "dark";
await fs.writeFile(path.join(values, "styles.xml"), `<?xml version="1.0" encoding="utf-8"?>
<resources><style name="AppTheme" parent="@android:style/Theme.Material.${dark ? "NoActionBar" : "Light.NoActionBar"}">
<item name="android:colorAccent">#7865E8</item>
<item name="android:statusBarColor">${dark ? "#11131B" : "#FFFFFF"}</item>
<item name="android:navigationBarColor">${dark ? "#11131B" : "#FFFFFF"}</item>
<item name="android:windowLightStatusBar">${dark ? "false" : "true"}</item>
</style></resources>`);
await fs.writeFile(path.join(app, "src/main/AndroidManifest.xml"), `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.INTERNET"/>
  <application android:label="@string/app_name" android:theme="@style/AppTheme"
    android:usesCleartextTraffic="false" android:allowBackup="false">
    <activity android:name=".MainActivity" android:exported="true"
      android:configChanges="orientation|screenSize|keyboardHidden">
      <intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter>
    </activity>
  </application>
</manifest>`);
await fs.writeFile(path.join(java, "MainActivity.java"), `package ${packageId};
import android.app.Activity;
import android.os.Bundle;
import android.webkit.*;
import android.view.*;
import android.widget.*;
import android.graphics.Color;

public class MainActivity extends Activity {
  WebView web;
  ProgressBar bar;
  static final String URL = "${javaString(parsed.toString())}";
  public void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().setStatusBarColor(Color.parseColor("${dark ? "#11131B" : "#FFFFFF"}"));
    getWindow().setNavigationBarColor(Color.parseColor("${dark ? "#11131B" : "#FFFFFF"}"));
    FrameLayout root = new FrameLayout(this);
    web = new WebView(this);
    bar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
    root.addView(web, new FrameLayout.LayoutParams(-1, -1));
    root.addView(bar, new FrameLayout.LayoutParams(-1, 5, Gravity.TOP));
    setContentView(root);
    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setMediaPlaybackRequiresUserGesture(true);
    web.setWebViewClient(new WebViewClient() {
      public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        return !"https".equalsIgnoreCase(request.getUrl().getScheme());
      }
    });
    web.setWebChromeClient(new WebChromeClient() {
      public void onProgressChanged(WebView view, int progress) {
        bar.setProgress(progress);
        bar.setVisibility(progress >= 100 ? View.GONE : View.VISIBLE);
      }
    });
    if (state == null) web.loadUrl(URL); else web.restoreState(state);
  }
  @Override public void onBackPressed() {
    if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
  }
  @Override protected void onSaveInstanceState(Bundle state) {
    if (web != null) web.saveState(state);
    super.onSaveInstanceState(state);
  }
  @Override protected void onDestroy() {
    if (web != null) { web.stopLoading(); web.destroy(); }
    super.onDestroy();
  }
}
`);
console.log("Generated Android project for", appName, "(", packageId, ")");