package com.reveltechnologies.filesizeminimizer;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.install.model.UpdateAvailability;

@CapacitorPlugin(name = "PlayUpdate")
public class PlayUpdatePlugin extends Plugin {

    @PluginMethod
    public void checkForUpdate(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            JSObject result = new JSObject();
            result.put("updateAvailable", false);
            call.resolve(result);
            return;
        }

        AppUpdateManager manager = AppUpdateManagerFactory.create(context);
        manager.getAppUpdateInfo()
            .addOnSuccessListener(info -> {
                boolean available =
                    info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE;
                JSObject result = new JSObject();
                result.put("updateAvailable", available);
                result.put("availableVersionCode", info.availableVersionCode());
                call.resolve(result);
            })
            .addOnFailureListener(err -> {
                JSObject result = new JSObject();
                result.put("updateAvailable", false);
                call.resolve(result);
            });
    }

    @PluginMethod
    public void openStoreListing(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.resolve();
            return;
        }

        String packageName = context.getPackageName();
        try {
            Intent marketIntent = new Intent(
                Intent.ACTION_VIEW,
                Uri.parse("market://details?id=" + packageName)
            );
            marketIntent.setPackage("com.android.vending");
            marketIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(marketIntent);
        } catch (ActivityNotFoundException ex) {
            try {
                Intent webIntent = new Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=" + packageName)
                );
                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(webIntent);
            } catch (Exception ignored) {
                // Ignore if no browser or Play Store can handle the intent
            }
        } catch (Exception ex) {
            try {
                Intent webIntent = new Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=" + packageName)
                );
                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(webIntent);
            } catch (Exception ignored) {
                // Ignore if no browser or Play Store can handle the intent
            }
        }

        call.resolve();
    }
}
