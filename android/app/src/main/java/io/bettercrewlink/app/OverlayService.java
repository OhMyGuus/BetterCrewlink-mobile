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
    private View chatHead;
    private static List<ImageView> imageViews = new ArrayList<ImageView>();

    @Override
    public IBinder onBind(Intent intent) {
        // Not used
        return null;
    }

    public static void setVisible(int color, boolean visible) {
        if (color >= 0 && color <= 12) {
            runOnUiThread(new Runnable() {

                @Override
                public void run() {

                    imageViews.get(color).setVisibility(visible? View.VISIBLE : View.GONE);
                }
            });
        }
    }

    ImageView addImage(int resId) {
        float density = Resources.getSystem().getDisplayMetrics().density;
        int width = (int) (40 * density);
        LinearLayout row = chatHead.findViewById(R.id.overlay_player_container);
        ImageView playerImg = new ImageView(this);
        playerImg.setImageResource(resId);
        row.addView(playerImg);
        playerImg.requestLayout();
        ViewGroup.LayoutParams layoutParams = playerImg.getLayoutParams();
        layoutParams.width = width;
        layoutParams.height = width;
        imageViews.add(playerImg);
        return playerImg;
    }

    @Override
    public void onCreate() {
        super.onCreate();

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        chatHead = LayoutInflater.from(this).inflate(R.layout.overlay_layout, null);

        for (int i = 0; i < 12; i++) {
            ImageView view = addImage(this.getResources().getIdentifier("playericon_" + i, "drawable", this.getPackageName()));
            view.setVisibility(View.GONE);
        }

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSPARENT);
        Context context = this;
        chatHead.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;
            private boolean side = false;

            private GestureDetector gestureDetector = new GestureDetector(context, new GestureDetector.SimpleOnGestureListener() {
                @Override
                public boolean onDoubleTap(MotionEvent e) {
                    LinearLayout row = chatHead.findViewById(R.id.overlay_player_container);

                    if (!side) {
                        row.setOrientation(LinearLayout.VERTICAL);
                        side = true;
                    } else {
                        row.setOrientation(LinearLayout.HORIZONTAL);
                        side = false;
                    }
                    params.x = 0;
                    params.y = 0;
                    windowManager.updateViewLayout(chatHead, params);

                    return super.onDoubleTap(e);
                }
            });

            @Override
            public boolean onTouch(View v, MotionEvent event) {

                gestureDetector.onTouchEvent(event);

                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_UP:
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        params.x = initialX + (int) (event.getRawX() - initialTouchX);
                        params.y = initialY + (int) (event.getRawY() - initialTouchY);
                        windowManager.updateViewLayout(chatHead, params);
                        return true;
                }
                return false;
            }
        });


        params.gravity = Gravity.TOP | Gravity.LEFT;
        params.x = 0;
        params.y = 100;

        windowManager.addView(chatHead, params);

    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (chatHead != null) windowManager.removeView(chatHead);
    }
}