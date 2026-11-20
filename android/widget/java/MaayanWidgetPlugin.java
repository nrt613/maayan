package io.github.nrt613.maayan;

import android.content.Context;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** תוסף מקומי קטן: שומר את סיכום הווידג'ט ב-SharedPreferences ומרענן את הווידג'טים שעל המסך */
@CapacitorPlugin(name = "MaayanWidget")
public class MaayanWidgetPlugin extends Plugin {
    @PluginMethod
    public void setData(PluginCall call) {
        String json = call.getString("json");
        if (json == null) { call.reject("missing json"); return; }
        Context ctx = getContext();
        ctx.getSharedPreferences(MaayanWidgetProvider.PREFS, Context.MODE_PRIVATE).edit().putString(MaayanWidgetProvider.KEY, json).commit();
        MaayanWidgetProvider.updateAll(ctx);
        call.resolve();
    }

    @PluginMethod
    public void getData(PluginCall call) {
        JSObject r = new JSObject();
        r.put("json", getContext().getSharedPreferences(MaayanWidgetProvider.PREFS, Context.MODE_PRIVATE).getString(MaayanWidgetProvider.KEY, null));
        call.resolve(r);
    }
}
