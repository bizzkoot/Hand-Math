/**
 * Local app version for the in-app release update checker.
 *
 * MUST be bumped together with every release (android/app/build.gradle
 * versionName/versionCode and package.json "version"). The APK WebView has
 * no synchronous way to read the native versionName from JS, so this
 * constant is the single source of truth for the packaged build.
 */
window.HANDMATH_VERSION = '1.0.5';
