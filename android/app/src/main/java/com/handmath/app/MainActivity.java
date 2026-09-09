package com.handmath.app;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;

import java.util.Locale;

/**
 * Android WebView does not implement the Web Speech API (window.speechSynthesis
 * is an empty stub there), so TTS narration is bridged to the native engine.
 * JS calls window.AndroidTTS; web browsers keep using window.speechSynthesis.
 */
public class MainActivity extends BridgeActivity {
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );
        getBridge().getWebView().addJavascriptInterface(new TtsBridge(), "AndroidTTS");
    }

    private class TtsBridge {
        @JavascriptInterface
        public boolean isReady() {
            return ttsReady;
        }

        /** Speak text (QUEUE_FLUSH replaces the current utterance). lang: 'en' | 'ms'. */
        @JavascriptInterface
        public void speak(String text, String lang) {
            ensureTts();
            Locale locale = "ms".equals(lang) ? new Locale("ms", "MY") : Locale.US;
            tts.setLanguage(locale);
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "hm");
        }

        @JavascriptInterface
        public void stop() {
            if (tts != null) tts.stop();
        }

        private synchronized void ensureTts() {
            if (tts != null) return;
            tts = new TextToSpeech(MainActivity.this, status -> ttsReady = status == TextToSpeech.SUCCESS);
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String utteranceId) {}
                @Override public void onDone(String utteranceId) { notifyJsDone(); }
                @Override public void onError(String utteranceId) { notifyJsDone(); }
            });
        }
    }

    /** Resolve the pending JS speak() promise (window.__ttsDone set by uiBindings._speak). */
    private void notifyJsDone() {
        runOnUiThread(() -> getBridge().getWebView().evaluateJavascript(
            "window.__ttsDone && window.__ttsDone()", null));
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        super.onDestroy();
    }
}
