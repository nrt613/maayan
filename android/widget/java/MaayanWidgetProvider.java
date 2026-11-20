package io.github.nrt613.maayan;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * וידג'ט מעיין למסך הבית. קורא את הסיכום שהאפליקציה כתבה (src/widget.js דרך MaayanWidgetPlugin)
 * ובוחר את השורה שתקפה עכשיו. השורות מחושבות מראש לשלושה ימים, ולכן הווידג'ט מתעדכן גם כשהאפליקציה סגורה:
 * שעון מעורר לא-מעיר (RTC) בגבול השורה הבאה, ו-updatePeriodMillis כגיבוי.
 * כשהווידג'ט כבוי בהגדרות (ברירת המחדל) מוצגים רק שם האפליקציה ו"פתיחת היומן".
 */
public class MaayanWidgetProvider extends AppWidgetProvider {
    static final String PREFS = "maayan_widget";
    static final String KEY = "summary";
    static final String ACTION_TICK = "io.github.nrt613.maayan.WIDGET_TICK";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(ctx, mgr, id));
        scheduleNext(ctx);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle options) {
        mgr.updateAppWidget(id, build(ctx, mgr, id));
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        String a = intent.getAction();
        if (ACTION_TICK.equals(a) || Intent.ACTION_TIME_CHANGED.equals(a) || Intent.ACTION_TIMEZONE_CHANGED.equals(a) || Intent.ACTION_DATE_CHANGED.equals(a)) updateAll(ctx);
    }

    @Override
    public void onDisabled(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(tickIntent(ctx));
    }

    /** נקרא מהתוסף אחרי כתיבת סיכום חדש, ומהשעון המעורר */
    static void updateAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, MaayanWidgetProvider.class));
        for (int id : ids) mgr.updateAppWidget(id, build(ctx, mgr, id));
        if (ids.length > 0) scheduleNext(ctx);
    }

    static JSONObject read(Context ctx) {
        try {
            SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String s = p.getString(KEY, null);
            return s == null ? null : new JSONObject(s);
        } catch (Exception e) {
            return null;
        }
    }

    /** השורה התקפה עכשיו, או null */
    static JSONObject current(JSONObject j, long now) {
        if (j == null || !j.optBoolean("enabled", false)) return null;
        JSONArray es = j.optJSONArray("entries");
        if (es == null) return null;
        for (int i = 0; i < es.length(); i++) {
            JSONObject e = es.optJSONObject(i);
            if (e != null && e.optLong("from") <= now && now < e.optLong("until")) return e;
        }
        return null;
    }

    static RemoteViews build(Context ctx, AppWidgetManager mgr, int id) {
        JSONObject j = read(ctx);
        long now = System.currentTimeMillis();
        Bundle o = mgr.getAppWidgetOptions(id);
        int minH = o == null ? 0 : o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0);
        boolean small = minH > 0 && minH < 100;
        boolean ltr = j != null && "ltr".equals(j.optString("dir", "rtl"));
        int layout = small ? (ltr ? R.layout.maayan_widget_small_ltr : R.layout.maayan_widget_small)
                : (ltr ? R.layout.maayan_widget_medium_ltr : R.layout.maayan_widget_medium);
        RemoteViews v = new RemoteViews(ctx.getPackageName(), layout);
        String app = j == null ? "מעיין" : j.optString("app", "מעיין");
        String head = app, line = j == null ? "" : j.optString("open", ""), next = "";
        JSONObject e = current(j, now);
        if (e != null) {
            String h = e.optString("head", "");
            head = h.isEmpty() ? app : h;
            line = e.optString("now", "");
            next = e.optString("next", "");
        } else if (j != null && j.optBoolean("enabled", false)) {
            line = j.optString("stale", line);
        }
        v.setTextViewText(R.id.maayan_widget_head, head);
        v.setTextViewText(R.id.maayan_widget_now, line);
        v.setViewVisibility(R.id.maayan_widget_now, line.isEmpty() ? View.GONE : View.VISIBLE);
        if (!small) {
            v.setTextViewText(R.id.maayan_widget_next, next);
            v.setViewVisibility(R.id.maayan_widget_next, next.isEmpty() ? View.GONE : View.VISIBLE);
        }
        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (open == null) open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        v.setOnClickPendingIntent(R.id.maayan_widget_root, PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        return v;
    }

    static PendingIntent tickIntent(Context ctx) {
        Intent i = new Intent(ctx, MaayanWidgetProvider.class).setAction(ACTION_TICK);
        return PendingIntent.getBroadcast(ctx, 1, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** שעון מעורר לא-מעיר לגבול השורה הבאה (או לסוף התקופה המחושבת) */
    static void scheduleNext(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        JSONObject j = read(ctx);
        long now = System.currentTimeMillis(), at = Long.MAX_VALUE;
        JSONArray es = j == null || !j.optBoolean("enabled", false) ? null : j.optJSONArray("entries");
        if (es != null) for (int i = 0; i < es.length(); i++) {
            JSONObject e = es.optJSONObject(i);
            if (e == null) continue;
            long u = e.optLong("until");
            if (u > now && u < at) at = u;
        }
        if (at == Long.MAX_VALUE) { am.cancel(tickIntent(ctx)); return; }
        am.set(AlarmManager.RTC, at + 1000, tickIntent(ctx));
    }
}
