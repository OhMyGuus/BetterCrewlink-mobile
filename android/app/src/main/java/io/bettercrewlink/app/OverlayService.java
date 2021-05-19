package io.bettercrewlink.app;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.res.Resources;
import android.graphics.PixelFormat;
import android.os.IBinder;
import android.view.GestureDetector;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.LinearLayout;

import java.util.ArrayList;
import java.util.List;

import static com.microsoft.appcenter.utils.HandlerUtils.runOnUiThread;

public class OverlayService extends Service {

    private WindowManager windowManager;
    private View iconsContainerView;
    private static List<ImageView> imageViews = new ArrayList<ImageView>();
    private static ImageView audioImageView;
    private static ImageView micImageView;
    private static ImageView refreshImageview;
    private static boolean mic_muted = false;
    private static boolean audio_muted = false;

    enum OVERLAY_BUTTON {
        MICROPHONE,
        AUDIO,
        REFRESH
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    public static void setVisible(int color, boolean visible) {
        if (color >= 0 && color <= 12) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (color < imageViews.size())
                        imageViews.get(color).setVisibility(visible ? View.VISIBLE : View.GONE);
                }
            });
        }
    }

    public static void HideShow(boolean hide){
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (audioImageView != null && micImageView != null && refreshImageview != null) {
                    audioImageView.setVisibility(hide ? View.GONE : View.VISIBLE);
                    micImageView.setVisibility(hide ? View.GONE : View.VISIBLE);
                    refreshImageview.setVisibility(hide ? View.GONE : View.VISIBLE);
                }
            }
        });

    }

    public static void updateMuteIcons(boolean mic_muted, boolean audio_muted) {
        OverlayService.mic_muted = mic_muted;
        OverlayService.audio_muted = audio_muted;
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (audioImageView != null && micImageView != null) {
                    audioImageView.setImageResource(audio_muted ? R.drawable.audio_off : R.drawable.audio_on);
                    micImageView.setImageResource(mic_muted ? R.drawable.mic_off : R.drawable.mic_on);
                }
            }
        });
    }


    ImageView addImage(int resId, boolean addToViewList) {
        return addImage(resId, addToViewList, 40, 40);
    }

    ImageView addImage(int resId, boolean addToViewList, int width, int height) {
        float density = Resources.getSystem().getDisplayMetrics().density;
        int calcWidth = (int) (width * density);
        int calcHeight = (int) (height * density);
        LinearLayout row = iconsContainerView.findViewById(R.id.overlay_player_container);
        ImageView img = new ImageView(this);
        img.setImageResource(resId);
        row.addView(img);
        img.requestLayout();
        ViewGroup.LayoutParams layoutParams = img.getLayoutParams();
        layoutParams.width = calcWidth;
        layoutParams.height = calcHeight;
        if (addToViewList) {
            imageViews.add(img);
        }
        return img;
    }

    public void pressOverlayButton(OVERLAY_BUTTON button) {
        BetterCrewlinkNativePlugin.bridgeP.triggerWindowJSEvent("press_overlay", "{ 'action': '" + button + "' }");
    }


    @Override
    public void onCreate() {
        super.onCreate();

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        iconsContainerView = LayoutInflater.from(this).inflate(R.layout.overlay_layout, null);
        refreshImageview = addImage(R.drawable.refresh_button, false);
        micImageView = addImage(mic_muted ? R.drawable.mic_off : R.drawable.mic_on, false);
        audioImageView = addImage(audio_muted ? R.drawable.audio_off : R.drawable.audio_on, false);


        for (int i = 0; i < 12; i++) {
            ImageView view = addImage(this.getResources().getIdentifier("playericon_" + i, "drawable", this.getPackageName()), true);
            view.setVisibility(View.GONE);
        }

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSPARENT);
        Context context = this;


        params.gravity = Gravity.TOP | Gravity.LEFT;
        params.x = 0;
        params.y = 100;

        AddTouchEventListner(context, iconsContainerView, params);
        windowManager.addView(iconsContainerView, params);

    }


    public void AddTouchEventListner(Context context, View view, WindowManager.LayoutParams
            params) {
        iconsContainerView.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;
            private boolean side = false;

            private GestureDetector gestureDetector = new GestureDetector(context, new GestureDetector.SimpleOnGestureListener() {
                @Override
                public boolean onDoubleTap(MotionEvent e) {
                    LinearLayout row = iconsContainerView.findViewById(R.id.overlay_player_container);

                    if (!side) {
                        row.setOrientation(LinearLayout.VERTICAL);
                        side = true;
                    } else {
                        row.setOrientation(LinearLayout.HORIZONTAL);
                        side = false;
                    }
                    params.x = 0;
                    params.y = 0;
                    windowManager.updateViewLayout(iconsContainerView, params);

                    return super.onDoubleTap(e);
                }
            });
            boolean clickingOnVolume = false;
            boolean clickingOnMic = false;
            boolean clickingOnRefresh = false;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
//                Log.w("OOF", "volumeImageView x: " + volumeImageView.getX() + " y:" + volumeImageView.getY() + " w: " + volumeImageView.getWidth() + " h: " + volumeImageView.getHeight() + " --> " + event.getX() + " -- " + event.getY());

                gestureDetector.onTouchEvent(event);
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        clickingOnVolume = event.getX() >= audioImageView.getX() && event.getX() <= audioImageView.getX() + audioImageView.getWidth() &&
                                event.getY() >= audioImageView.getY() && event.getY() <= audioImageView.getY() + audioImageView.getHeight();
                        clickingOnMic = event.getX() >= micImageView.getX() && event.getX() <= micImageView.getX() + micImageView.getWidth() &&
                                event.getY() >= micImageView.getY() && event.getY() <= micImageView.getY() + micImageView.getHeight();
                        clickingOnRefresh = event.getX() >= refreshImageview.getX() && event.getX() <= refreshImageview.getX() + refreshImageview.getWidth() &&
                                event.getY() >= refreshImageview.getY() && event.getY() <= refreshImageview.getY() + refreshImageview.getHeight();

                        return false;
                    case MotionEvent.ACTION_UP:
                        int movedPixels = Math.abs(initialX - params.x) + Math.abs(initialY - params.y);
                        if (movedPixels > 10) {
                            return false;
                        }
                        if (clickingOnMic) {
                            pressOverlayButton(OVERLAY_BUTTON.MICROPHONE);
                        }
                        if (clickingOnVolume) {
                            pressOverlayButton(OVERLAY_BUTTON.AUDIO);
                        }
                        if (clickingOnRefresh) {
                            pressOverlayButton(OVERLAY_BUTTON.REFRESH);
                        }
                        return false;
                    case MotionEvent.ACTION_MOVE:
                        params.x = initialX + (int) (event.getRawX() - initialTouchX);
                        params.y = initialY + (int) (event.getRawY() - initialTouchY);
                        windowManager.updateViewLayout(iconsContainerView, params);
                        return false;
                }
                return false;
            }
        });
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (iconsContainerView != null) windowManager.removeView(iconsContainerView);
    }
}