package at.snagbite.app;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Safety net: if React never mounts (e.g. JS hydration error) we still hide
    // the splash after 3s so the user isn't trapped. See AGENTS.md "Splash-Hang".
    private static final long SPLASH_SAFETY_TIMEOUT_MS = 3000L;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable splashSafetyTimeout = new Runnable() {
        @Override
        public void run() {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    WebView wv = getBridge().getWebView();
                    // Call the @capacitor/splash-screen plugin's hide() via JS, which
                    // dismisses both the native AndroidX splash and the WebView overlay.
                    wv.evaluateJavascript(
                        "(function(){try{if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.SplashScreen){Capacitor.Plugins.SplashScreen.hide().catch(function(){});}else{document.querySelector('html').classList.remove('splash-hide');}}catch(e){}})();",
                        null
                    );
                }
            } catch (Throwable ignored) { }
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mainHandler.postDelayed(splashSafetyTimeout, SPLASH_SAFETY_TIMEOUT_MS);
        bridgeSafeAreaInsets();
        disableWebViewOverScroll();
    }

    private void disableWebViewOverScroll() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
            }
        } catch (Throwable ignored) { }
    }

    /**
     * Feed the real system-window insets (status bar, navigation bar, display
     * cutout) into the WebView as CSS custom properties. On Android 15+ the app
     * runs edge-to-edge, and while most WebViews expose these via CSS env(),
     * some devices report 0 for env(safe-area-inset-top) — which lets app
     * content slide under the status bar. Setting --safe-area-inset-* directly
     * from the platform insets guarantees correct padding everywhere. Fully
     * guarded so a failure just falls back to the CSS env() defaults.
     */
    private void bridgeSafeAreaInsets() {
        try {
            if (getBridge() == null || getBridge().getWebView() == null) return;
            final WebView webView = getBridge().getWebView();
            ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
                try {
                    Insets bars = windowInsets.getInsets(
                        WindowInsetsCompat.Type.systemBars()
                            | WindowInsetsCompat.Type.displayCutout());
                    float density = getResources().getDisplayMetrics().density;
                    if (density <= 0f) density = 1f;
                    final int top = Math.round(bars.top / density);
                    final int right = Math.round(bars.right / density);
                    final int bottom = Math.round(bars.bottom / density);
                    final int left = Math.round(bars.left / density);
                    final String js =
                        "(function(){try{var s=document.documentElement.style;"
                        + "s.setProperty('--safe-area-inset-top','" + top + "px');"
                        + "s.setProperty('--safe-area-inset-right','" + right + "px');"
                        + "s.setProperty('--safe-area-inset-bottom','" + bottom + "px');"
                        + "s.setProperty('--safe-area-inset-left','" + left + "px');"
                        + "}catch(e){}})();";
                    webView.post(() -> {
                        try {
                            webView.evaluateJavascript(js, null);
                        } catch (Throwable ignored) { }
                    });
                } catch (Throwable ignored) { }
                return windowInsets;
            });
            ViewCompat.requestApplyInsets(webView);
        } catch (Throwable ignored) { }
    }

    @Override
    public void onDestroy() {
        mainHandler.removeCallbacks(splashSafetyTimeout);
        super.onDestroy();
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent); // so checkSendIntentReceived() reads the new share, not the launch intent
        if (getBridge() != null) {
            getBridge().triggerWindowJSEvent("sendIntentReceived");
        }
    }
}
