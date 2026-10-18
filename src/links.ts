import { Alert, Linking, Platform } from 'react-native';
import { EXTERNAL_HOSTS, HOME_URL, SITE_HOSTS } from './config';

/** Schemes the WebView can render itself. */
const IN_APP_SCHEMES = ['http:', 'https:', 'about:', 'data:', 'blob:', 'javascript:', 'file:'];

function hostOf(url: string): string {
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#:]+)/i.exec(url);
  return m ? m[1].toLowerCase() : '';
}

function schemeOf(url: string): string {
  const m = /^([a-z][a-z0-9+.-]*:)/i.exec(url);
  return m ? m[1].toLowerCase() : '';
}

function matchesHost(host: string, list: string[]): boolean {
  return list.some((h) => host === h || host.endsWith('.' + h));
}

export function isSiteUrl(url: string): boolean {
  return matchesHost(hostOf(url), SITE_HOSTS);
}

/** True when the URL must be handed to another app / the system browser. */
export function shouldOpenExternally(url: string): boolean {
  const scheme = schemeOf(url);
  if (!scheme) return false;
  if (!IN_APP_SCHEMES.includes(scheme)) return true; // upi:, phonepe:, tel:, mailto:, intent:, whatsapp: ...
  if (scheme === 'http:' || scheme === 'https:') {
    return matchesHost(hostOf(url), EXTERNAL_HOSTS);
  }
  return false;
}

/**
 * Android "intent://" links (used by many UPI / payment pages) cannot be opened directly.
 * Rebuild the real URL (e.g. upi://pay?...) and remember the fallback web URL if given.
 */
function parseAndroidIntent(url: string): { target?: string; fallback?: string } {
  const hashIdx = url.indexOf('#Intent;');
  if (hashIdx === -1) return {};
  const body = url.substring('intent://'.length, hashIdx);
  const params: Record<string, string> = {};
  url
    .substring(hashIdx + '#Intent;'.length)
    .split(';')
    .forEach((part) => {
      const eq = part.indexOf('=');
      if (eq > 0) params[part.substring(0, eq)] = part.substring(eq + 1);
    });
  let fallback: string | undefined;
  if (params['S.browser_fallback_url']) {
    try {
      fallback = decodeURIComponent(params['S.browser_fallback_url']);
    } catch {
      fallback = params['S.browser_fallback_url'];
    }
  }
  const target = params.scheme ? `${params.scheme}://${body}` : undefined;
  return { target, fallback };
}

function appName(url: string): string {
  const s = schemeOf(url).replace(':', '');
  const names: Record<string, string> = {
    upi: 'a UPI app',
    phonepe: 'PhonePe',
    paytmmp: 'Paytm',
    tez: 'Google Pay',
    gpay: 'Google Pay',
    bhim: 'BHIM',
    credpay: 'CRED',
    whatsapp: 'WhatsApp',
  };
  return names[s] || 'the app needed for this link';
}

/**
 * Opens a URL outside the WebView. Returns a fallback http(s) URL that the caller
 * should load inside the WebView instead, when one exists and the app is missing.
 */
export async function openExternal(url: string): Promise<string | undefined> {
  let target = url;
  let fallback: string | undefined;

  if (schemeOf(url) === 'intent:') {
    const parsed = parseAndroidIntent(url);
    fallback = parsed.fallback;
    if (parsed.target) {
      target = parsed.target;
    } else if (fallback) {
      return fallback;
    } else {
      Alert.alert('Cannot open link', 'The app needed for this link is not installed.');
      return undefined;
    }
  }

  try {
    await Linking.openURL(target);
    return undefined;
  } catch {
    if (fallback) return fallback;
    const scheme = schemeOf(target);
    if (scheme === 'http:' || scheme === 'https:') {
      Alert.alert('Cannot open link', 'No browser is available to open this link.');
    } else {
      Alert.alert(
        'App not installed',
        `Please install ${appName(target)} to continue${
          ['upi:', 'phonepe:', 'paytmmp:', 'tez:', 'gpay:', 'bhim:', 'credpay:'].includes(scheme)
            ? ', or choose another payment method.'
            : '.'
        }`
      );
    }
    return undefined;
  }
}

/**
 * Converts an incoming deep link into a page to load in the app, or null if it
 * should be ignored. Supports https://originbazar.store/... and originbazar://path.
 */
export function deepLinkToPage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (isSiteUrl(url) && /^https?:/i.test(url)) return url.replace(/^http:/i, 'https:');
  const m = /^originbazar:\/\/\/?(.*)$/i.exec(url);
  if (m) {
    const path = m[1];
    if (!path || path.startsWith('expo-development-client')) return null;
    return HOME_URL + path.replace(/^\/+/, '');
  }
  return null;
}

export const IS_ANDROID = Platform.OS === 'android';
