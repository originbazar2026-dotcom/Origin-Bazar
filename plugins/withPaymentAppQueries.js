// Expo config plugin for Android:
//  1. Declares <queries> so Android 11+ can see installed UPI / payment / social apps
//     (PhonePe, Google Pay, Paytm, BHIM, CRED, WhatsApp...) when the site opens them.
//  2. Marks the camera as optional so phones/tablets without a camera can still install.
const { withAndroidManifest } = require('expo/config-plugins');

const SCHEMES = ['upi', 'phonepe', 'paytmmp', 'tez', 'gpay', 'bhim', 'credpay', 'whatsapp', 'tel', 'mailto', 'sms'];
const PACKAGES = [
  'com.phonepe.app',
  'com.google.android.apps.nbu.paisa.user',
  'net.one97.paytm',
  'in.org.npci.upiapp',
  'com.dreamplug.androidapp',
  'in.amazon.mShop.android.shopping',
  'com.whatsapp',
  'com.whatsapp.w4b',
];

module.exports = function withPaymentAppQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    const intents = SCHEMES.map((scheme) => ({
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      data: [{ $: { 'android:scheme': scheme } }],
    }));
    const packages = PACKAGES.map((name) => ({ $: { 'android:name': name } }));

    manifest.queries = manifest.queries || [];
    manifest.queries.push({ intent: intents, package: packages });

    manifest['uses-feature'] = (manifest['uses-feature'] || []).filter(
      (f) => f.$['android:name'] !== 'android.hardware.camera'
    );
    manifest['uses-feature'].push(
      { $: { 'android:name': 'android.hardware.camera', 'android:required': 'false' } },
      { $: { 'android:name': 'android.hardware.camera.autofocus', 'android:required': 'false' } }
    );

    return cfg;
  });
};
