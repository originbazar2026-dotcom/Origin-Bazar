import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type {
  FileDownloadEvent,
  ShouldStartLoadRequest,
  WebViewErrorEvent,
  WebViewNavigation,
  WebViewProgressEvent,
} from 'react-native-webview/lib/WebViewTypes';

import { BRAND, HOME_URL, SPLASH_MAX_MS, USER_AGENT_SUFFIX } from './src/config';
import { deepLinkToPage, IS_ANDROID, openExternal, shouldOpenExternally } from './src/links';

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 300 });

// Error codes that only mean "navigation was cancelled" (e.g. we opened UPI / WhatsApp
// outside the app). They are not real failures, so no error screen is shown.
/** The few WebView methods the app calls. */
type WebHandle = Pick<WebView, 'goBack' | 'reload' | 'injectJavaScript'>;

const IGNORED_ERROR_CODES = new Set([-999, 102, 204, -10 /* Android ERROR_UNSUPPORTED_SCHEME */]);

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <Shop />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Shop() {
  const webRef = useRef<WebHandle | null>(null);
  const canGoBack = useRef(false);
  const lastBackPress = useRef(0);
  const splashHidden = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;

  const [startUrl, setStartUrl] = useState<string | null>(null);
  const [webKey, setWebKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const hideSplash = useCallback(() => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const goTo = useCallback((url: string) => {
    webRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(url)}; true;`);
  }, []);

  // Decide the first page: a deep link that launched the app, or the home page.
  useEffect(() => {
    let alive = true;
    Linking.getInitialURL()
      .catch((): null => null)
      .then((url: string | null | undefined) => {
        if (alive) setStartUrl(deepLinkToPage(url) ?? HOME_URL);
      });
    const timer = setTimeout(hideSplash, SPLASH_MAX_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [hideSplash]);

  // Deep links that arrive while the app is already open.
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const page = deepLinkToPage(url);
      if (page) goTo(page);
    });
    return () => sub.remove();
  }, [goTo]);

  // Android hardware back: go back in the shop, or press twice to exit.
  useEffect(() => {
    if (!IS_ANDROID) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current && !failed) {
        webRef.current?.goBack();
        return true;
      }
      const now = Date.now();
      if (now - lastBackPress.current < 2000) return false; // let Android close the app
      lastBackPress.current = now;
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      return true;
    });
    return () => sub.remove();
  }, [failed]);

  const onShouldStart = useCallback(
    (req: ShouldStartLoadRequest) => {
      const { url } = req;
      const isHttp = /^https?:/i.test(url);
      // Embedded frames (YouTube videos, maps, payment widgets) always load in place.
      if (isHttp && req.isTopFrame === false) return true;
      if (shouldOpenExternally(url)) {
        openExternal(url).then((fallback) => {
          if (fallback) goTo(fallback);
        });
        return false;
      }
      return true;
    },
    [goTo]
  );

  const onNavChange = useCallback((nav: WebViewNavigation) => {
    canGoBack.current = nav.canGoBack;
  }, []);

  const onProgress = useCallback(
    ({ nativeEvent }: WebViewProgressEvent) => {
      Animated.timing(progress, {
        toValue: nativeEvent.progress,
        duration: 150,
        useNativeDriver: false,
      }).start();
    },
    [progress]
  );

  const onLoadStart = useCallback(() => {
    setLoading(true);
    progress.setValue(0.05);
  }, [progress]);

  const onLoadEnd = useCallback(() => {
    setLoading(false);
    hideSplash();
  }, [hideSplash]);

  const onError = useCallback(
    ({ nativeEvent }: WebViewErrorEvent) => {
      hideSplash();
      if (IGNORED_ERROR_CODES.has(nativeEvent.code)) return;
      const d = (nativeEvent.description || '').toLowerCase();
      if (d.includes('err_unknown_url_scheme') || d.includes('frame load interrupted')) return;
      setFailed(true);
    },
    [hideSplash]
  );

  const retry = useCallback(() => {
    setFailed(false);
    if (webRef.current) webRef.current.reload();
    else setWebKey((k) => k + 1);
  }, []);

  // If the OS kills the browser engine (low memory), rebuild it instead of crashing.
  const recreateWebView = useCallback(() => setWebKey((k) => k + 1), []);

  const reloadWebView = useCallback((): void => webRef.current?.reload(), []);

  // iOS: hand downloads (invoices, PDFs) to Safari so they can be saved or shared.
  // (Android downloads are saved by the system download manager automatically.)
  const onFileDownload = useCallback(({ nativeEvent }: FileDownloadEvent): void => {
    Linking.openURL(nativeEvent.downloadUrl).catch(() => {});
  }, []);

  if (!startUrl) return <View style={styles.root} />;

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <KeyboardAvoidingView style={styles.root} behavior={IS_ANDROID ? 'padding' : undefined}>
      <WebView
        key={webKey}
        ref={(r: WebHandle | null) => {
          webRef.current = r;
        }}
        source={{ uri: startUrl }}
        style={styles.web}
        containerStyle={styles.web}
        originWhitelist={['*']}
        applicationNameForUserAgent={USER_AGENT_SUFFIX}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        cacheEnabled
        cacheMode="LOAD_DEFAULT"
        allowFileAccess={false}
        allowsInlineMediaPlayback
        allowsBackForwardNavigationGestures
        allowsLinkPreview={false}
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        textZoom={100}
        overScrollMode="never"
        androidLayerType="hardware"
        mixedContentMode="never"
        decelerationRate="normal"
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        startInLoadingState={false}
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        onShouldStartLoadWithRequest={onShouldStart}
        onNavigationStateChange={onNavChange}
        onLoadStart={onLoadStart}
        onLoadProgress={onProgress}
        onLoadEnd={onLoadEnd}
        onError={onError}
        renderError={renderBlank}
        onRenderProcessGone={recreateWebView}
        onContentProcessDidTerminate={reloadWebView}
        onFileDownload={onFileDownload}
      />

      {loading && !failed && (
        <View pointerEvents="none" style={styles.barTrack}>
          <Animated.View style={[styles.bar, { width: barWidth }]} />
        </View>
      )}

      {failed && <OfflineScreen onRetry={retry} />}
    </KeyboardAvoidingView>
  );
}

function renderBlank() {
  return <View style={styles.blank} />;
}

function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.offline}>
      <Image source={require('./assets/icon.png')} style={styles.offlineLogo} resizeMode="contain" />
      <Text style={styles.offlineTitle}>You're offline</Text>
      <Text style={styles.offlineText}>
        Origin Bazar couldn't load. Check your internet connection and try again.
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
      >
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND.white },
  web: { flex: 1, backgroundColor: BRAND.white },
  blank: { flex: 1, backgroundColor: BRAND.white },
  barTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  bar: { height: 3, backgroundColor: BRAND.orange },
  offline: {
    ...StyleSheet.absoluteFill,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  offlineLogo: { width: 120, height: 120, marginBottom: 16 },
  offlineTitle: { fontSize: 22, fontWeight: '700', color: BRAND.navy, marginBottom: 8 },
  offlineText: { fontSize: 15, lineHeight: 22, color: BRAND.muted, textAlign: 'center', marginBottom: 28 },
  retry: { backgroundColor: BRAND.orange, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 28 },
  retryText: { color: BRAND.white, fontSize: 16, fontWeight: '700' },
});
