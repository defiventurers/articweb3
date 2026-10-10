package xyz.arcticdominion.play;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URLConnection;
import java.util.Collections;

public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/assets/index.html";
    private WebView web;
    private FrameLayout root;
    private boolean ready;
    private String pendingRoom;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.WHITE);
        root.setFitsSystemWindows(Build.VERSION.SDK_INT < 30);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                Insets keyboard = insets.getInsets(WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
                return WindowInsets.CONSUMED;
            });
        }
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        if (Build.VERSION.SDK_INT >= 26) settings.setSafeBrowsingEnabled(true);
        WebView.setWebContentsDebuggingEnabled(false);
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new NativeBridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!"https".equals(uri.getScheme()) || !HOST.equals(uri.getHost())) return null;
                String path = uri.getPath();
                if (path == null || !path.startsWith("/assets/") || path.contains("..") || path.indexOf('\0') >= 0) return blocked();
                try {
                    String asset = path.substring(8);
                    String mime = asset.endsWith(".js") ? "text/javascript" : asset.endsWith(".css") ? "text/css" : asset.endsWith(".html") ? "text/html" : asset.endsWith(".webp") ? "image/webp" : URLConnection.guessContentTypeFromName(asset);
                    WebResourceResponse response = new WebResourceResponse(mime == null ? "application/octet-stream" : mime, "UTF-8", getAssets().open(asset));
                    response.setResponseHeaders(Collections.singletonMap("Cache-Control", "no-cache"));
                    return response;
                } catch (IOException error) { return blocked(); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && uri.getPath() != null && uri.getPath().startsWith("/assets/")) return false;
                if ("arcticplay".equals(uri.getScheme())) { receiveRoom(uri); return true; }
                if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                }
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (url.startsWith(HOME)) { ready = true; deliverRoom(); }
            }
        });
        receiveRoom(getIntent().getData());
        web.loadUrl(HOME);
    }
    private WebResourceResponse blocked() { return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream("Not available".getBytes())); }
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); receiveRoom(intent.getData()); }
    private void receiveRoom(Uri uri) {
        if (uri == null || !"arcticplay".equals(uri.getScheme()) || !"room".equals(uri.getHost())) return;
        String path = uri.getLastPathSegment();
        if (path != null && path.toUpperCase(java.util.Locale.ROOT).matches("[A-Z2-9]{6}")) { pendingRoom = path.toUpperCase(java.util.Locale.ROOT); deliverRoom(); }
    }
    private void deliverRoom() {
        if (!ready || pendingRoom == null) return;
        String code = pendingRoom;
        web.evaluateJavascript("(function(){if(window.arcticJoin){window.arcticJoin('" + code + "');return true;}return false;})()", value -> {
            if ("true".equals(value) && code.equals(pendingRoom)) pendingRoom = null;
        });
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("window.arcticBack ? window.arcticBack() : false", value -> { if (!"true".equals(value)) moveTaskToBack(true); });
    }
    @Override protected void onResume() { super.onResume(); if (web != null) { web.onResume(); web.resumeTimers(); } }
    @Override protected void onPause() { if (web != null) { web.onPause(); web.pauseTimers(); } super.onPause(); }
    @Override protected void onDestroy() { if (web != null) { web.removeJavascriptInterface("Android"); web.destroy(); } super.onDestroy(); }

    public final class NativeBridge {
        @JavascriptInterface public void appReady() { runOnUiThread(() -> { ready = true; deliverRoom(); }); }
        @JavascriptInterface public void setDarkTheme(boolean dark) { runOnUiThread(() -> {
            int color = dark ? Color.rgb(33,31,49) : Color.WHITE;
            root.setBackgroundColor(color); web.setBackgroundColor(color);
            getWindow().setStatusBarColor(color); getWindow().setNavigationBarColor(color);
            if (Build.VERSION.SDK_INT >= 30) {
                WindowInsetsController controller = getWindow().getInsetsController();
                if (controller != null) { int flags = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS; controller.setSystemBarsAppearance(dark ? 0 : flags, flags); }
            } else { int flags = dark ? 0 : View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR; if (!dark && Build.VERSION.SDK_INT >= 26) flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR; getWindow().getDecorView().setSystemUiVisibility(flags); }
        }); }
        @JavascriptInterface public void backgroundApp() { runOnUiThread(() -> moveTaskToBack(true)); }
        @JavascriptInterface public void shareText(String title, String text) { runOnUiThread(() -> {
            Intent send = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text).putExtra(Intent.EXTRA_SUBJECT, title);
            try { startActivity(Intent.createChooser(send, "Invite a friend")); } catch (Exception error) { Toast.makeText(MainActivity.this, "No sharing app is available.", Toast.LENGTH_SHORT).show(); }
        }); }
        @JavascriptInterface public void shareApp() { runOnUiThread(() -> {
            Uri uri = Uri.parse("content://xyz.arcticdominion.play.apk/ArcticPlay.apk");
            Intent send = new Intent(Intent.ACTION_SEND).setType("application/vnd.android.package-archive").putExtra(Intent.EXTRA_STREAM, uri).putExtra(Intent.EXTRA_TEXT, "Install Arctic Play, then join my private game room.");
            send.setClipData(ClipData.newRawUri("Arctic Play APK", uri));send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            try { startActivity(Intent.createChooser(send, "Share Arctic Play APK")); } catch (Exception error) { Toast.makeText(MainActivity.this, "No app can share this APK. Share the downloaded installation file instead.", Toast.LENGTH_LONG).show(); }
        }); }
    }
}
