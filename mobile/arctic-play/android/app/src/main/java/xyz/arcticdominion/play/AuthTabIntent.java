package xyz.arcticdominion.play;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Bundle;

/** Official Custom Tabs low-level protocol; never an embedded OAuth WebView. */
public final class AuthTabIntent {
    private AuthTabIntent() { }
    public static Intent create(Context context, String url) {
        if (!AuthBrowserUrl.allowed(url)) return null;
        Intent tab = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        tab.addCategory(Intent.CATEGORY_BROWSABLE);
        ResolveInfo preferred = context.getPackageManager().resolveActivity(tab, 0);
        String preferredPackage = preferred == null ? null : preferred.activityInfo.packageName;
        String provider = null;
        for (ResolveInfo info : context.getPackageManager().queryIntentServices(
                new Intent("android.support.customtabs.action.CustomTabsService"), 0)) {
            String candidate = info.serviceInfo.packageName;
            Intent view = new Intent(Intent.ACTION_VIEW, Uri.parse(url)).setPackage(candidate);
            if (context.getPackageManager().resolveActivity(view, 0) != null) {
                if (provider == null) provider = candidate;
                if (candidate.equals(preferredPackage)) { provider = candidate; break; }
            }
        }
        if (provider == null) return null;
        tab.setPackage(provider);
        Bundle options = new Bundle();
        options.putBinder("android.support.customtabs.extra.SESSION", null);
        options.putInt("android.support.customtabs.extra.TOOLBAR_COLOR", 0xffedf7ff);
        options.putInt("android.support.customtabs.extra.TITLE_VISIBILITY", 1);
        tab.putExtras(options);
        // Keep the secure sign-in surface in the app task; no NEW_TASK flags.
        return tab;
    }
}
