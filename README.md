# Origin Bazar — Android & iOS app

Native mobile app for **https://originbazar.store** (Expo / React Native).
Package / Bundle ID: `store.originbazar.app` · Version 1.0.0

## What the app does
- Opens originbazar.store full-screen with the Origin Bazar splash screen and app icon
- Logins, cart and sessions are kept (cookies + local storage saved)
- **Payments work**: Cashfree / CCAvenue checkout and bank OTP pages stay in the app;
  UPI buttons open PhonePe, Google Pay, Paytm, BHIM, CRED directly. If an app is missing,
  the customer gets a clear "install app or choose another payment method" message
- WhatsApp, phone, email, Instagram, Facebook, YouTube, Maps and Play Store links open in their own apps
- Android back button goes back page by page; press twice on the first page to exit
- Orange loading bar, "You're offline" screen with **Try again**
- Sellers can upload photos (camera or gallery); invoices/PDF downloads work
- Keyboard never hides form fields; works on notches and gesture-navigation phones
- Opening an originbazar.store link (or `originbazar://product/123`) opens the app
- Small and fast: hardware rendering, caching, phone CPUs only (arm64 + armv7)
- Website can detect the app: user-agent contains `OriginBazarApp/1.0`

---

## 1. Get the APK (free, no Android Studio) — GitHub
1. Create a **private** repository on github.com and upload everything in this folder
   (keep the hidden `.github` folder).
2. Repository → **Settings → Secrets and variables → Actions → New repository secret**. Add 4 secrets
   from the separate `originbazar-signing` package:
   | Secret name | Value |
   |---|---|
   | `OB_KEYSTORE_BASE64` | whole content of `keystore-base64.txt` |
   | `OB_KEYSTORE_PASSWORD` | from `passwords.txt` |
   | `OB_KEY_ALIAS` | `originbazar` |
   | `OB_KEY_PASSWORD` | from `passwords.txt` |
3. **Actions** tab → **Build Android APK** → **Run workflow**. Takes ~15 minutes.
4. Open the finished run → **Artifacts** → download **OriginBazar-APK** → unzip → `OriginBazar-v1.0.0.apk`.
5. Send the APK to any Android phone and install (allow "Install unknown apps" once).

`OriginBazar-AAB-PlayStore` from the same run is the file to upload to Google Play Console.

> Keep the `originbazar-signing` files safe and private (Google Drive + one offline copy).
> Every future update must be signed with the same key, otherwise phones refuse to update.

## 2. Or build with Expo EAS (Android APK + iOS)
```bash
npm install
npm install -g eas-cli
eas login
eas init                                     # links the project to your Expo account
eas build -p android --profile preview      # → direct APK download link
eas build -p android --profile production   # → AAB for Google Play
eas build -p ios --profile production       # → iOS build for App Store / TestFlight
eas submit -p ios                            # sends it to App Store Connect
```

### iOS — important
Apple does not allow "direct install" files like APK. To put the app on iPhones you need an
**Apple Developer account (US$99/year)**. Then `eas build -p ios` creates the build and
`eas submit -p ios` uploads it to TestFlight / App Store. EAS creates the certificates for you.
App Store review note: Apple rejects apps that are "only a website". Mention native features
(UPI app payments, camera upload, deep links, offline screen) in the review notes and make sure
the site works smoothly on mobile.

## 3. Build on your own computer (needs Android Studio)
```bash
npm install
npm run apk        # → android/app/build/outputs/apk/release/app-release.apk
```

## Changing things
| What | Where |
|---|---|
| Website address, external links list, brand colours | `src/config.ts` |
| App name, version, icons, permissions | `app.json` (raise `version` **and** `android.versionCode` / `ios.buildNumber` for every update) |
| Icons / splash | `assets/` (replace with a high-resolution logo for sharper icons) |
| Screens, back button, payments handling | `App.tsx`, `src/links.ts` |

## Notes for the website
- **Google "Sign in with Google" does not work inside any app WebView** (Google blocks it).
  Use phone OTP / email login in the app, or hide the Google button when the user-agent contains `OriginBazarApp`.
- For links to open the app automatically without asking (Android App Links), upload
  `https://originbazar.store/.well-known/assetlinks.json` with the SHA-256 fingerprint of your
  signing key (in `originbazar-signing/README.txt`). Optional.
