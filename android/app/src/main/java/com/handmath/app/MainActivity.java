package com.handmath.app;

import android.media.AudioAttributes;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;
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
    private static final String TAG = "HandMathTTS";
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;

    // Queued utterance if speak() is called while the TTS engine is still initializing.
    private String pendingText = null;
    private String pendingLang = null;
    private float pendingRate = 1.0f;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        // Eagerly initialize TTS on launch so it is ready before user interactions.
        initTts();

        getBridge().getWebView().addJavascriptInterface(new TtsBridge(), "AndroidTTS");
    }

    private synchronized void initTts() {
        if (tts != null) return;
        try {
            tts = new TextToSpeech(MainActivity.this, status -> {
                if (status == TextToSpeech.SUCCESS) {
                    Log.i(TAG, "TextToSpeech engine initialized successfully");
                    // Route TTS audio to the media stream so it follows user media volume
                    AudioAttributes attrs = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build();
                    tts.setAudioAttributes(attrs);

                    tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                        @Override
                        public void onStart(String utteranceId) {
                            Log.d(TAG, "TTS onStart: " + utteranceId);
                        }

                        @Override
                        public void onDone(String utteranceId) {
                            Log.d(TAG, "TTS onDone: " + utteranceId);
                            notifyJsDone();
                        }

                        @Override
                        public void onError(String utteranceId) {
                            Log.e(TAG, "TTS onError: " + utteranceId);
                            notifyJsDone();
                        }

                        @Override
                        public void onError(String utteranceId, int errorCode) {
                            Log.e(TAG, "TTS onError: " + utteranceId + ", errorCode: " + errorCode);
                            notifyJsDone();
                        }

                        @Override
                        public void onStop(String utteranceId, boolean interrupted) {
                            Log.d(TAG, "TTS onStop: " + utteranceId + ", interrupted: " + interrupted);
                            notifyJsDone();
                        }
                    });

                    ttsReady = true;

                    // Drain pending speech if speak() was called before engine ready
                    if (pendingText != null) {
                        String text = pendingText;
                        String lang = pendingLang;
                        float rate = pendingRate;
                        pendingText = null;
                        pendingLang = null;
                        pendingRate = 1.0f;
                        performSpeak(text, lang, rate);
                    }
                } else {
                    Log.e(TAG, "TextToSpeech engine initialization failed with status: " + status);
                    ttsReady = false;
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Failed to instantiate TextToSpeech", e);
            ttsReady = false;
        }
    }

    private synchronized void performSpeak(String text, String lang, float rate) {
        if (tts == null || !ttsReady) {
            Log.w(TAG, "performSpeak called before TTS ready; queueing utterance");
            pendingText = text;
            pendingLang = lang;
            pendingRate = rate;
            return;
        }

        try {
            Locale locale = "ms".equals(lang) ? new Locale("ms", "MY") : Locale.US;
            int result = tts.setLanguage(locale);
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                Log.w(TAG, "Locale " + locale + " missing or not supported (" + result + "); attempting fallback");
                if ("ms".equals(lang)) {
                    result = tts.setLanguage(new Locale("ms"));
                }
                if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                    Log.w(TAG, "Falling back to Locale.US");
                    tts.setLanguage(Locale.US);
                }
            }

            if (rate > 0f) {
                tts.setSpeechRate(rate);
            }

            Bundle params = new Bundle();
            params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f);
            String utteranceId = "hm_" + System.currentTimeMillis();
            Log.d(TAG, "Speaking utterance " + utteranceId + ": " + text + " (lang=" + lang + ", rate=" + rate + ")");
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId);
        } catch (Exception e) {
            Log.e(TAG, "Error invoking tts.speak", e);
            notifyJsDone();
        }
    }

    private class TtsBridge {
        @JavascriptInterface
        public boolean isReady() {
            if (tts == null) {
                initTts();
            }
            return ttsReady;
        }

        /** Speak text (QUEUE_FLUSH replaces current utterance). lang: 'en' | 'ms'. */
        @JavascriptInterface
        public void speak(String text, String lang) {
            speak(text, lang, 1.0);
        }

        /** Speak text with speech rate. */
        @JavascriptInterface
        public void speak(String text, String lang, double rate) {
            initTts();
            performSpeak(text, lang, (float) rate);
        }

        @JavascriptInterface
        public void stop() {
            pendingText = null;
            pendingLang = null;
            if (tts != null) {
                try {
                    tts.stop();
                } catch (Exception e) {
                    Log.e(TAG, "Error stopping TTS", e);
                }
            }
        }
    }

    /** Resolve the pending JS speak() promise (window.__ttsDone set by uiBindings._speak). */
    private void notifyJsDone() {
        runOnUiThread(() -> {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "window.__ttsDone && window.__ttsDone()", null);
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to evaluate __ttsDone in WebView", e);
            }
        });
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Exception e) {
                Log.e(TAG, "Error shutting down TTS", e);
            }
            tts = null;
            ttsReady = false;
        }
        super.onDestroy();
    }
}
