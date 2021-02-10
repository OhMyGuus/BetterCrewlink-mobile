package io.bettercrewlink.app;

import android.app.Service;
import android.content.Intent;
import android.content.res.Resources;
import android.graphics.PixelFormat;
import android.os.IBinder;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.TableRow;

public class ChatHeadService extends Service {

    private WindowManager windowManager;
    private View chatHead;

    @Override
    public IBinder onBind(Intent intent) {
        // Not used
        return null;
    }

    void addImage(int resId) {
        float density = Resources.getSystem().getDisplayMetrics().density;
        int width = (int) (60 * density);
        TableRow row = chatHead.findViewById(R.id.TableRow01);
        ImageView test = new ImageView(this);
        test.setImageResource(R.drawable.half_player);
        row.addView(test);
        test.requestLayout();
        ViewGroup.LayoutParams layoutParams = test.getLayoutParams();
        layoutParams.width = width;
        layoutParams.height = width;
    }

    @Override
    public void onCreate() {
        super.onCreate();

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        // chatHead = new TestView(this);
        chatHead = LayoutInflater.from(this).inflate(R.layout.test, null);
        addImage(R.mipmap.ic_launcher);
        for(int i = 0; i < 7; i++)
        addImage(R.drawable.half_player);
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSPARENT);
        chatHead.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;

            
            @Override
            public boolean onTouch(View v, MotionEvent event) {
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