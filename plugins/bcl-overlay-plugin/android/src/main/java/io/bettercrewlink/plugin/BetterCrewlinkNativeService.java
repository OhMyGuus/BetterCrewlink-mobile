package io.bettercrewlink.plugin;

import android.util.Log;

public class BetterCrewlinkNativeService {

    public String echo(String value) {
        Log.i("Echo", value);
        return value;
    }
}
