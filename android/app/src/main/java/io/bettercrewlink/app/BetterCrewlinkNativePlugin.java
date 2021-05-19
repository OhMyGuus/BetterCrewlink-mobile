package io.bettercrewlink.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.text.Html;
import android.text.SpannableString;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.NativePlugin;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;

import java.util.Timer;
import java.util.TimerTask;

import static androidx.core.content.ContextCompat.getSystemService;


@NativePlugin()
public class BetterCrewlinkNativePlugin extends Plugin {

    static Bridge bridgeP;
    private Boolean audionMuted = false;
    private boolean micMuted = false;
    private boolean timmerRunning = false;
    private boolean running = false;
    private boolean overlayShown = false;

    @PluginMethod()
    public void showNotification(PluginCall call) {
        Boolean audioMuted = call.getBoolean("audiomuted");
        Boolean micMuted = call.getBoolean("micmuted");
        Boolean overlayEnabled = call.getBoolean("overlayEnabled");

        this.audionMuted = audioMuted;
        this.micMuted = micMuted;
        String message = call.getString("message");
        String CallbackId = call.getCallbackId();
        JSObject ret = new JSObject();
        ret.put("result", "ok");
        CreateNotification();
        call.success(ret);
        CreateTimer();
        OverlayService.updateMuteIcons(micMuted, audioMuted);
        if ((!overlayShown) && overlayEnabled && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this.getContext())) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + this.getContext().getPackageName()));
                startActivityForResult(call, intent, 0);
            } else {
                Context context = this.getContext();
                context.startService(new Intent(context, OverlayService.class));
                overlayShown = true;
            }
        }
        if (overlayShown) {
            OverlayService.HideShow(false);
        }
        running = true;
    }


    @PluginMethod()
    public void showTalking(PluginCall call) {
        int color = call.getInt("color");
        Boolean talking = call.getBoolean("talking");
        Context context = this.getContext();
        OverlayService.setVisible(color, talking);
    }


    @PluginMethod()
    public void disconnect(PluginCall call) {
        if(overlayShown)
        OverlayService.HideShow(true);

        running = false;
    }

    private void CreateTimer() {
        if (timmerRunning) {
            return;
        }
        timmerRunning = true;
        Timer t = new Timer();
        t.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                OnTimerTick();
            }
        }, 1000, 5000);
    }


    private void OnTimerTick() {
        if (running)
            CreateNotification();
    }

    boolean NotifactionChannelCreated = false;

    private void createNotificationChannel() {
        if (NotifactionChannelCreated) {
            return;
        }
        // Create the NotificationChannel, but only on API 26+ because
        // the NotificationChannel class is new and not in the support library
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "1";
            String description = "2";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel channel = new NotificationChannel("1", name, importance);
            channel.setSound(null, null);
            channel.setDescription(description);
            // Register the channel with the system; you can't change the importance
            // or other notification behaviors after this
            NotificationManager notificationManager = getSystemService(this.getContext(), NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }


    public PendingIntent createAction(String action) {
        Intent intent = new Intent(this.getContext(), BetterCrewlinkNativeService.class);
        intent.setAction(action);
        PendingIntent piAction1 = PendingIntent.getService(this.getContext(), 0, intent, PendingIntent.FLAG_UPDATE_CURRENT);
        return piAction1;
    }

    int notificationCount = 0;

    public void CreateNotification() {
        //   createNotificationChannel();
        bridgeP = bridge;
        BetterCrewlinkNativeService service = getSystemService(this.getContext(), BetterCrewlinkNativeService.class);
        PendingIntent refreshAction = createAction(BetterCrewlinkNativeService.REFRESH);
        String body = "<b>Guus(red)</b> talking <br><b>player2(lime)</b> talking";
        SpannableString spannableString = new SpannableString(Build.VERSION.SDK_INT < Build.VERSION_CODES.N ? Html.fromHtml(body) : Html.fromHtml(body, Html.FROM_HTML_MODE_LEGACY));

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this.getContext(), "bettercrewlink-background-id")
                .setSmallIcon(R.drawable.ic_notification)
                .setContentIntent(refreshAction)
                .setContentTitle("BetterCrewlink")
                .setContentText("Click to refresh or expand for more")

                // .setStyle(new NotificationCompat.BigTextStyle().bigText(spannableString).setBigContentTitle("BetterCrewlink"))
                .addAction(0, "refresh", refreshAction)
                .addAction(0, this.micMuted ? "unmute" : "mute", createAction(BetterCrewlinkNativeService.MUTEMICROPHONE))
                .addAction(0, this.audionMuted ? "undeafen" : "deafen", createAction(BetterCrewlinkNativeService.MUTEAUDIO))
                .setAutoCancel(false)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);


//        Notification Noti = new Notification.Builder(this.getContext())
//                .setContentTitle("YourTitle")
//                .setContentText("YourDescription")
//                .setSmallIcon(R.mipmap.ic_launcher)
//                .setContentIntent(pIntent)
//                .setAutoCancel(true).build();

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this.getContext());

// notificationId is a unique int for each notification that you must define
        notificationManager.notify(-574543954, builder.build());
    }

}