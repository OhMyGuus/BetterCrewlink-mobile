package io.bettercrewlink.app;

import android.app.IntentService;
import android.content.Intent;

import com.getcapacitor.Bridge;

public class BetterCrewlinkNativeService extends IntentService {
    public static final String REFRESH = "REFRESH";
    public static final String MUTEAUDIO = "MUTEAUDIO";
    public static final String MUTEMICROPHONE = "MUTEMICROPHONE";

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
        final String action = intent.getAction();
        if (REFRESH.equals(action)) {
          BetterCrewlinkNativePlugin.bridgeP.triggerWindowJSEvent("bettercrewlink_notification",  "{ 'action': 'REFRESH' }");
        } else  if (MUTEAUDIO.equals(action)) {
            BetterCrewlinkNativePlugin.bridgeP.triggerWindowJSEvent("bettercrewlink_notification",  "{ 'action': 'MUTEAUDIO' }");
        } else  if (MUTEMICROPHONE.equals(action)) {
            BetterCrewlinkNativePlugin.bridgeP.triggerWindowJSEvent("bettercrewlink_notification",  "{ 'action': 'MUTEMICROPHONE' }");
        }

    }
}