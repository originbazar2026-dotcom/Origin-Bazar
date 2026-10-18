// Central settings for the Origin Bazar app. Change values here, not in the screens.

export const HOME_URL = 'https://originbazar.store/';

/** Hosts that belong to Origin Bazar. Deep links to these open inside the app. */
export const SITE_HOSTS = ['originbazar.store', 'originbazar.shop'];

/**
 * Hosts that should always leave the app and open in their own app / the system browser.
 * Everything else that is http(s) — including Cashfree / CCAvenue checkout and bank OTP
 * (3-D Secure) pages — stays inside the app so payments complete and return correctly.
 */
export const EXTERNAL_HOSTS = [
  'wa.me',
  'api.whatsapp.com',
  'chat.whatsapp.com',
  'web.whatsapp.com',
  'facebook.com',
  'm.facebook.com',
  'fb.me',
  'instagram.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'm.youtube.com',
  'youtu.be',
  'linkedin.com',
  't.me',
  'telegram.me',
  'pinterest.com',
  'play.google.com',
  'apps.apple.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'goo.gl',
];

/** Appended to the normal mobile browser user-agent so the website can detect the app. */
export const USER_AGENT_SUFFIX = 'OriginBazarApp/1.0';

export const BRAND = {
  orange: '#FD6F0B',
  navy: '#082340',
  white: '#FFFFFF',
  muted: '#5B6B80',
};

/** Hide the splash screen after this long even if the home page is still loading (ms). */
export const SPLASH_MAX_MS = 6000;
