package io.github.nrt613.maayan;

import android.app.Activity;
import android.content.Context;
import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * נעילת האפליקציה: כשהנעילה בקוד פעילה, התוכן לא מוצג במסך האפליקציות האחרונות וצילומי מסך נחסמים (FLAG_SECURE).
 * ההגדרה נשמרת גם בצד הנייטיב, כדי שתחול כבר מהפריים הראשון בפתיחה הבאה, לפני שהדף נטען.
 */
@CapacitorPlugin(name = "MaayanPrivacy")
public class MaayanPrivacy extends Plugin {
    private static final String PREFS = "maayan_privacy";

    /** נקרא מ-MainActivity.onCreate */
    public static void applySaved(Activity activity) {
        apply(activity, activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("secure", false));
    }

    private static void apply(Activity activity, boolean on) {
        if (on) activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        else activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
    }

    @PluginMethod
    public void setSecure(PluginCall call) {
        final boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean("secure", on).apply();
        final Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            apply(activity, on);
            call.resolve();
        });
    }
}
