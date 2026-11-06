package xyz.arcticdominion.play;

import android.app.Activity;
import android.util.Base64;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageInfo;
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
import java.io.File;
import java.io.FileOutputStream;
import java.net.URLConnection;
import java.util.Collections;
import org.json.JSONObject;

public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/assets/index.html";
    private WebView web;
    private FrameLayout root;
    private boolean ready;
    private boolean authInProgress;
    private String pendingRoom;
    private String pendingAuth;
    private String pendingChallenge;
    private boolean pendingCamp;
    private byte[] pendingProof;
    private static final int SAVE_PROOF = 680;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        root = new FrameLayout(this);
        root.setBackground(getResources().getDrawable(R.drawable.launch_ice, getTheme()));
        root.setFitsSystemWindows(Build.VERSION.SDK_INT < 30);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        web = new WebView(this);
        web.setBackgroundColor(Color.TRANSPARENT);
        // A new APK must never reuse artwork cached by an older build.
        try {
            int build = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
            android.content.SharedPreferences cache = getSharedPreferences("ak-art-cache", MODE_PRIVATE);
            if (cache.getInt("build", -1) != build) {
                web.clearCache(true);
                cache.edit().putInt("build", build).apply();
            }
        } catch (Exception ignored) { }
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
                    boolean artwork = asset.matches(".*[.](webp|png|jpe?g|gif|svg|mp3|ogg|wav|woff2?|ttf)$");
                    response.setResponseHeaders(Collections.singletonMap("Cache-Control", artwork ? "public, max-age=31536000, immutable" : "no-cache"));
                    return response;
                } catch (IOException error) { return blocked(); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && uri.getPath() != null && uri.getPath().startsWith("/assets/")) return false;
                if ("arcticplay".equals(uri.getScheme()) || "antarctickingdoms".equals(uri.getScheme())) { receiveRoom(uri); return true; }
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
        if(uri!=null&&"arcticplay".equals(uri.getScheme())&&"auth".equals(uri.getHost())){String ticket=uri.getQueryParameter("ticket");if(ticket!=null&&ticket.matches("[A-Za-z0-9_-]{43}")){pendingAuth=ticket;deliverRoom();}return;}
        if(uri!=null&&("arcticplay".equals(uri.getScheme())||"antarctickingdoms".equals(uri.getScheme()))&&"camp".equals(uri.getHost())&&"restore".equals(uri.getLastPathSegment())){pendingCamp=true;deliverRoom();return;}
        if(uri!=null&&("arcticplay".equals(uri.getScheme())||"antarctickingdoms".equals(uri.getScheme()))&&"challenge".equals(uri.getHost())){String value=uri.getLastPathSegment();if(value!=null&&value.matches("[A-Za-z0-9_-]{24}")){pendingChallenge=value;deliverRoom();}return;}
        if (uri == null || !("arcticplay".equals(uri.getScheme()) || "antarctickingdoms".equals(uri.getScheme())) || !"room".equals(uri.getHost())) return;
        String path = uri.getLastPathSegment();
        if (path != null && path.toUpperCase(java.util.Locale.ROOT).matches("[A-Z2-9]{6}")) { pendingRoom = path.toUpperCase(java.util.Locale.ROOT); deliverRoom(); }
    }
    private void deliverRoom() {
        if(!ready)return;
        if(pendingAuth!=null){String ticket=pendingAuth;web.evaluateJavascript("(function(){if(window.arcticAuth){window.arcticAuth("+JSONObject.quote(ticket)+");return true;}return false;})()",value->{if("true".equals(value)&&ticket.equals(pendingAuth))pendingAuth=null;});}
        if(pendingCamp)web.evaluateJavascript("(function(){if(window.arcticCampRestore){window.arcticCampRestore();return true;}return false;})()",value->{if("true".equals(value))pendingCamp=false;});
        if(pendingChallenge!=null){String challenge=pendingChallenge;web.evaluateJavascript("(function(){if(window.arcticChallenge){window.arcticChallenge("+JSONObject.quote(challenge)+");return true;}return false;})()",value->{if("true".equals(value)&&challenge.equals(pendingChallenge))pendingChallenge=null;});}
        if (pendingRoom == null) return;
        String code = pendingRoom;
        web.evaluateJavascript("(function(){if(window.arcticJoin){window.arcticJoin('" + code + "');return true;}return false;})()", value -> {
            if ("true".equals(value) && code.equals(pendingRoom)) pendingRoom = null;
        });
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("window.arcticBack ? window.arcticBack() : false", value -> { if (!"true".equals(value)) moveTaskToBack(true); });
    }
    @Override protected void onResume() { super.onResume(); if (web != null) { web.onResume(); web.resumeTimers(); } authInProgress = false; }
    // Keep image decoding and the bounded preload queue running while the
    // system browser handles sign-in. Ordinary backgrounding still pauses it.
    @Override protected void onPause() { if (web != null && !authInProgress) { web.onPause(); web.pauseTimers(); } super.onPause(); }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request!=SAVE_PROOF)return;
        byte[] bytes=pendingProof;pendingProof=null;
        if(result!=RESULT_OK||data==null||data.getData()==null||bytes==null)return;
        try(java.io.OutputStream out=getContentResolver().openOutputStream(data.getData())){if(out==null)throw new IOException("No destination");out.write(bytes);Toast.makeText(this,"Match proof saved.",Toast.LENGTH_SHORT).show();}
        catch(Exception e){Toast.makeText(this,"The match proof could not be saved. Try another destination.",Toast.LENGTH_LONG).show();}
    }
    @Override protected void onDestroy() { if (web != null) { web.removeJavascriptInterface("Android"); web.destroy(); } super.onDestroy(); }

    public final class NativeBridge {
        @JavascriptInterface public boolean saveFairProof(String filename,String json) {
            if(filename==null||!filename.matches("Antarctic-proof-[a-fA-F0-9-]{36}\\.json")||json==null||json.length()>20*1024*1024)return false;
            final byte[] bytes=json.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            runOnUiThread(()->{if(pendingProof!=null)return;pendingProof=bytes;try{Intent save=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE,filename);startActivityForResult(save,SAVE_PROOF);}catch(Exception e){pendingProof=null;Toast.makeText(MainActivity.this,"No file saver is available on this phone.",Toast.LENGTH_LONG).show();}});return true;
        }
        @JavascriptInterface public String newUuid(){return java.util.UUID.randomUUID().toString();}
        @JavascriptInterface public void openBoardEditor(){runOnUiThread(()->{try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://arcticdominion.xyz/assets/heritage-arcade/sanyou-piece-placement.html")).addCategory(Intent.CATEGORY_BROWSABLE));}catch(Exception e){Toast.makeText(MainActivity.this,"A browser is needed to open the board editor.",Toast.LENGTH_LONG).show();}});}
        @JavascriptInterface public boolean openCheckout(String url){
            if(url==null||!url.matches("https://(rzp[.]io|rzp[.]co|pages[.]razorpay[.]com)/[A-Za-z0-9_/?=&%-]+"))return false;
            try{if("com.android.vending".equals(getPackageManager().getInstallerPackageName(getPackageName())))return false;}catch(Exception ignored){}
            runOnUiThread(()->{try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE));}catch(Exception e){Toast.makeText(MainActivity.this,"A browser is needed to open checkout.",Toast.LENGTH_LONG).show();}});return true;
        }
        @JavascriptInterface public String getInstallationId(){android.content.SharedPreferences prefs=getSharedPreferences("ak-install-v1",MODE_PRIVATE);String id=prefs.getString("id",null);if(id==null){id=java.util.UUID.randomUUID().toString();prefs.edit().putString("id",id).commit();}return id;}
        @JavascriptInterface public boolean openAuth(String url){
            if(!AuthBrowserUrl.allowed(url))return false;
            final Intent tab=AuthTabIntent.create(MainActivity.this,url);
            if(tab==null)return false;
            runOnUiThread(()->{try{authInProgress=true;startActivity(tab);}catch(Exception e){authInProgress=false;web.evaluateJavascript("window.dispatchEvent(new CustomEvent('arctic-auth-error',{detail:{message:'Sign-in could not open. Try again or use recovery.'}}))",null);}});
            return true;
        }
        @JavascriptInterface public String getCloudSession(){ return new CloudVault(MainActivity.this).get(); }
        @JavascriptInterface public boolean setCloudSession(String value){ return new CloudVault(MainActivity.this).put(value); }
        @JavascriptInterface public String getAppInfo() {
            try {
                PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
                return new JSONObject().put("packageName", getPackageName()).put("versionName", info.versionName).put("versionCode", Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode).toString();
            } catch (Exception error) { return "{}"; }
        }
        @JavascriptInterface public boolean downloadUpdate(String url) {
            if (url == null || !url.matches("https://raw[.]githubusercontent[.]com/defiventurers/articweb3/arctic-play-releases/releases/ArcticPlay-v[0-9]+[.][0-9]+[.][0-9]+[.]apk")) return false;
            runOnUiThread(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE)); }
                catch (Exception error) { Toast.makeText(MainActivity.this, "A browser is needed to download the update.", Toast.LENGTH_LONG).show(); }
            });
            return true;
        }
        @JavascriptInterface public void appReady() { runOnUiThread(() -> { ready = true; deliverRoom(); }); }
        @JavascriptInterface public void setDarkTheme(boolean dark) { runOnUiThread(() -> {
            int color = dark ? Color.rgb(6,26,50) : Color.rgb(220,239,251);
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
        @JavascriptInterface public boolean sharePostcard(String dataUrl,String text){
            if(dataUrl==null||!dataUrl.startsWith("data:image/png;base64,")||dataUrl.length()>8000000||text==null||text.length()>3000)return false;
            try{byte[] bytes=Base64.decode(dataUrl.substring(22),Base64.DEFAULT);
                if(bytes.length<8||bytes[0]!=(byte)137||bytes[1]!=80||bytes[2]!=78||bytes[3]!=71||bytes[4]!=13||bytes[5]!=10||bytes[6]!=26||bytes[7]!=10)return false;
                File directory=new File(getCacheDir(),"postcards");if(!directory.isDirectory()&&!directory.mkdirs())return false;
                File[] old=directory.listFiles();if(old!=null&&old.length>20){java.util.Arrays.sort(old,(a,b)->Long.compare(a.lastModified(),b.lastModified()));for(int i=0;i<old.length-20;i++)if(old[i].getName().matches("postcard-[0-9]+\\.png"))old[i].delete();}
                File file=new File(directory,"postcard-"+String.valueOf(System.nanoTime()).replace("-","")+".png");try(FileOutputStream stream=new FileOutputStream(file)){stream.write(bytes);}
                final Uri uri=Uri.parse("content://xyz.arcticdominion.play.postcards/"+file.getName());
                runOnUiThread(()->{Intent send=new Intent(Intent.ACTION_SEND).setType("image/png").putExtra(Intent.EXTRA_STREAM,uri).putExtra(Intent.EXTRA_TEXT,text);send.setClipData(ClipData.newRawUri("Antarctic Kingdoms postcard",uri));send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);try{startActivity(Intent.createChooser(send,"Share your penguin postcard"));}catch(Exception error){Toast.makeText(MainActivity.this,"No sharing app is available.",Toast.LENGTH_SHORT).show();}});return true;
            }catch(Exception error){return false;}
        }
        @JavascriptInterface public void shareApp() { runOnUiThread(() -> {
            Uri uri = Uri.parse("content://xyz.arcticdominion.play.apk/AntarcticKingdoms.apk");
            Intent send = new Intent(Intent.ACTION_SEND).setType("application/vnd.android.package-archive").putExtra(Intent.EXTRA_STREAM, uri).putExtra(Intent.EXTRA_TEXT, "Install Antarctic Kingdoms, then join my private game room.");
            send.setClipData(ClipData.newRawUri("Antarctic Kingdoms APK", uri));send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            try { startActivity(Intent.createChooser(send, "Share Antarctic Kingdoms APK")); } catch (Exception error) { Toast.makeText(MainActivity.this, "No app can share this APK. Share the downloaded installation file instead.", Toast.LENGTH_LONG).show(); }
        }); }
    }
}
