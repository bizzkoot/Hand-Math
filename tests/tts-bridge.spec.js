// @ts-check
const { test, expect } = require('@playwright/test');

// Android WebView has no Web Speech API, so _speak must route through the
// native bridge (window.AndroidTTS, injected by MainActivity) and resolve
// when the bridge calls window.__ttsDone().
test.describe('TTS native bridge', () => {
  test('_speak prefers AndroidTTS over speechSynthesis and forwards speech rate', async ({ page }) => {
    await page.addInitScript(() => {
      window.__ttsCalls = [];
      window.AndroidTTS = {
        isReady: () => true,
        speak: (text, lang, rate) => {
          window.__ttsCalls.push({ text, lang, rate });
          setTimeout(() => { window.__ttsDone && window.__ttsDone(); }, 20);
        },
        stop: () => {},
      };
      // Prove the native path wins even where speechSynthesis exists.
      try { delete window.speechSynthesis; } catch (_) {}
    });
    await page.goto('/index.html');
    await page.waitForFunction(() => window.__HM__ && window.handMathApp);
    const calls = await page.evaluate(async () => {
      window.__HM__.ui._ttsEnabled = true;
      window.__HM__.ui._speed = 1.2;
      await window.__HM__.ui._speak('Two + Two = Four');
      return window.__ttsCalls;
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].lang).toBe('en');
    expect(calls[0].text).toBe('Two plus Two equals Four');
    expect(calls[0].rate).toBe(1.2);
  });

  test('_speak succeeds when AndroidTTS becomes ready asynchronously', async ({ page }) => {
    await page.addInitScript(() => {
      window.__ttsCalls = [];
      let ready = false;
      setTimeout(() => { ready = true; }, 300);
      window.AndroidTTS = {
        isReady: () => ready,
        speak: (text, lang, rate) => {
          window.__ttsCalls.push({ text, lang, rate });
          setTimeout(() => { window.__ttsDone && window.__ttsDone(); }, 20);
        },
        stop: () => {},
      };
    });
    await page.goto('/index.html');
    await page.waitForFunction(() => window.__HM__ && window.handMathApp);
    const calls = await page.evaluate(async () => {
      window.__HM__.ui._ttsEnabled = true;
      await window.__HM__.ui._speak('Five − Three = Two');
      return window.__ttsCalls;
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].text).toBe('Five minus Three equals Two');
  });

  test('_stopSpeech stops native TTS and clears pending callback', async ({ page }) => {
    await page.addInitScript(() => {
      window.__ttsStopped = false;
      window.AndroidTTS = {
        isReady: () => true,
        speak: () => {},
        stop: () => { window.__ttsStopped = true; },
      };
    });
    await page.goto('/index.html');
    await page.waitForFunction(() => window.__HM__ && window.handMathApp);
    const stopped = await page.evaluate(() => {
      let resolved = false;
      window.__ttsDone = () => { resolved = true; };
      window.__HM__.ui._stopSpeech();
      return {
        stopped: window.__ttsStopped,
        resolved: resolved,
        doneCleared: window.__ttsDone === null
      };
    });
    expect(stopped.stopped).toBe(true);
    expect(stopped.resolved).toBe(true);
    expect(stopped.doneCleared).toBe(true);
  });
});
