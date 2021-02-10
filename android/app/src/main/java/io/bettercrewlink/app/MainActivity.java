package io.bettercrewlink.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      if (!Settings.canDrawOverlays(this)) {
        Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName()));
        startActivityForResult(intent, 0);
      }
    }

    // Initializes the Bridge
    this.init(savedInstanceState, new ArrayList<Class<? extends Plugin>>() {{
      // Additional plugins you've installed go here
      add(BetterCrewlinkNativePlugin.class);
    //  add(OverlayPlugin.class);
    }});

   //  if (BuildConfig.DEBUG) {
     //   this.bridge.getWebView().setWebViewClient(new BridgeWebViewClient(this.bridge) {
       //     @Override
         //   public void onReceivedSslError(android.webkit.WebView view, SslErrorHandler handler,
           //                                SslError error) {
             //   handler.proceed();
            //}
       // });
   // }
    
  }

}
