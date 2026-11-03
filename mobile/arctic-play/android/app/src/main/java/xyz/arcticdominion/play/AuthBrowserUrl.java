package xyz.arcticdominion.play;

import java.net.URI;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;

/** Only the application wallet portal and legacy Google OAuth may leave the WebView. */
public final class AuthBrowserUrl {
    private AuthBrowserUrl() { }
    public static boolean allowed(String value) {
        if (value == null || value.length() > 6000) return false;
        try {
            URI uri = new URI(value);
            if (!"https".equals(uri.getScheme()) || uri.getRawUserInfo() != null || uri.getRawFragment() != null || (uri.getPort() != -1 && uri.getPort() != 443)) return false;
            String query = uri.getRawQuery();
            if (query == null || query.isEmpty()) return false;
            if ("accounts.google.com".equals(uri.getHost()) && "/o/oauth2/v2/auth".equals(uri.getRawPath())) return true;
            if (!"articweb3.onrender.com".equals(uri.getHost()) || !"/arctic-play/wallet/".equals(uri.getRawPath())) return false;
            Map<String,String> params = new HashMap<>();
            for (String part : query.split("&", -1)) {
                String[] pair = part.split("=", 2);
                if (pair.length != 2) return false;
                String key = URLDecoder.decode(pair[0], "UTF-8"), val = URLDecoder.decode(pair[1], "UTF-8");
                if (!("attempt".equals(key) || "provider".equals(key)) || params.containsKey(key)) return false;
                params.put(key, val);
            }
            String attempt = params.get("attempt");
            return attempt != null && attempt.matches("[A-Za-z0-9_-]{43}") && (!params.containsKey("provider") || "para".equals(params.get("provider")));
        } catch (Exception ignored) { return false; }
    }
}
