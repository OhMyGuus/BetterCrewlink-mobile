package io.bettercrewlink.plugin;

import android.app.IntentService;
import android.content.Intent;

import com.getcapacitor.Bridge;

public class BetterCrewlinkNativeService extends IntentService {
    public static final String REFRESH = "REFRESH";
    public static final String MUTEAUDIO = "MUTEAUDIO";
    public static final String MUTEMICROPHONE = "MUTEMICROPHONE";
    public static final String DISCONNECT = "DISCONNECT";

//    public static final String ACTION2 = "ACTION2";

    Bridge bridge;

    public BetterCrewlinkNativeService() {
        super("BetterCrewlinkNativeService");
    }

    public void setBridge(Bridge bridge) {
        this.bridge = bridge;
    }

    @Override
    public void onHandleIntent(Intent intent) {
        android.util.Log.d("BetterCrewlinkNativeService", "onHandleIntent called with action: " + (intent != null ? intent.getAction() : "null"));
        if(BetterCrewlinkNativeServicePlugin.bridgeP != null) {
            final String action = intent.getAction();
            BetterCrewlinkNativeServicePlugin.bridgeP.triggerWindowJSEvent("bettercrewlink_notification", "{ 'action': '"+action+"' }");
        }
    }
}