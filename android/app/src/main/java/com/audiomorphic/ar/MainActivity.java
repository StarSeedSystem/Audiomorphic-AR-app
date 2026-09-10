package com.audiomorphic.ar;

import com.getcapacitor.BridgeActivity;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Pre-configure window for complete immersive full screen before inflation
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        super.onCreate(savedInstanceState);
        setupEdgeToEdgeFullscreen();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            setupEdgeToEdgeFullscreen();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        setupEdgeToEdgeFullscreen();
    }

    @Override
    public void onAttachedToWindow() {
        super.onAttachedToWindow();
        setupEdgeToEdgeFullscreen();
    }

    private void setupEdgeToEdgeFullscreen() {
        Window window = getWindow();
        if (window == null) return;

        // Render behind display cutouts (camera notches and punch holes on Android 9+ / P+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams params = window.getAttributes();
            params.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(params);
        }

        // Fullscreen and Keep Screen On flags
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        window.clearFlags(WindowManager.LayoutParams.FLAG_FORCE_NOT_FULLSCREEN);

        // Completely transparent system status and navigation bars
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        // Disable decor fits so webview spans behind all system bars
        WindowCompat.setDecorFitsSystemWindows(window, false);

        View decorView = window.getDecorView();
        if (decorView != null) {
            // Modern API: Hide all system bars (status bar + navigation bar)
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
            if (controller != null) {
                controller.hide(WindowInsetsCompat.Type.systemBars());
                controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }

            // Legacy fallback for maximum compatibility across all Android versions
            decorView.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );

            // Re-hide system bars automatically if user swipes or system attempts to show them
            decorView.setOnSystemUiVisibilityChangeListener(visibility -> {
                if ((visibility & View.SYSTEM_UI_FLAG_FULLSCREEN) == 0) {
                    WindowInsetsControllerCompat ctrl = WindowCompat.getInsetsController(window, decorView);
                    if (ctrl != null) {
                        ctrl.hide(WindowInsetsCompat.Type.systemBars());
                    }
                    decorView.setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    );
                }
            });
        }

        // Ensure Capacitor WebView also does not fit system windows
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().setFitsSystemWindows(false);
            }
        } catch (Throwable ignored) {}
    }
}
