// @ts-check
const { test, expect } = require('@playwright/test');

// Android WebView has no Web Speech API, so _speak must route through the
// native bridge (window.AndroidTTS, injected by MainActivity) and resolve
// when the bridge calls window.__ttsDone().
test.describe('TTS native bridge', () => {
  test('_speak prefers AndroidTTS over speechSynthesis', async ({ page }) => {
    await page.addInitScript(() => {
      window.__ttsCalls = [];
      window.AndroidTTS = {
        isReady: () => true,
        speak: (text, lang) => {
          window.__ttsCalls.push({ text, lang });
          setTimeout(() => { window.__ttsDone && window.__ttsDone(); }, 20);
        },
        stop: () => {},
      };
      // Prove the native path wins even where speechSynthesis exists.
      try { delete window.speechSynthesis; } catch (_) {}
    });
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.__HM__ && window.handMathApp);
    const calls = await page.evaluate(async () => {
      window.__HM__.ui._ttsEnabled = true;
      await window.__HM__.ui._speak('Two + Two = Four');
      return window.__ttsCalls;
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].lang).toBe('en');
    expect(calls[0].text).toBe('Two plus Two equals Four');
  });
});
