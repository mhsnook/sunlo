# Native apps with Capacitor

Capacitor wraps the Vite build in a native iOS and Android shell. The whole
stack ships unchanged — React, TanStack Router, TanStack DB, Supabase realtime,
Tailwind — because a Capacitor app is the same SPA running in a system WebView.
There is no second codebase and no port.

The native projects live in `android/` and `ios/`. Both are generated, both are
checked in, and both are yours to edit: Capacitor writes them once and then
leaves them alone, so a manifest change or a signing config survives every
later `cap sync`.

## Commands

```bash
pnpm cap:sync            # vite build, then copy dist/ into both platforms
pnpm cap:android         # sync, then open the project in Android Studio
pnpm cap:ios             # sync, then open the workspace in Xcode
pnpm cap:run:android     # sync, then build and launch on a device or emulator
pnpm cap:doctor          # report what the local toolchain is missing
```

`cap sync` copies `dist/` and re-reads the plugin list. Run it after every
`pnpm build`, after adding a plugin, and after changing `capacitor.config.ts`.

Android needs Android Studio and a JDK. iOS needs Xcode on a Mac; Capacitor 8
resolves iOS dependencies through Swift Package Manager, so CocoaPods is no
longer part of the setup.

## What the WebView changes

Four browser assumptions in the app do not hold inside the shell.

### The origin is not the site

`window.location.origin` is `https://localhost` in the WebView. Any link built
from it points at nothing on the recipient's device, which silently breaks
shared URLs, invite QR codes, and the redirect on an auth email.

Build outgoing links from `webOrigin` in `src/lib/native.ts` instead. It reads
`VITE_PUBLIC_ORIGIN` on a native build and falls back to
`window.location.origin` on the web, so preview deploys still share their own
URL. A native build without `VITE_PUBLIC_ORIGIN` set falls back to
`https://sunlo.app`.

Links that stay inside the app — router `<Link>`s, `copyLink()` on the current
page — need no change.

### The Web Share API is absent

Neither platform WebView implements `navigator.share`, so every share button
that gated on it hid itself in the native build. Share through
`shareLink()` from `src/lib/native.ts`, gate on `canShareLink`, and swallow a
dismissed sheet with `isShareCancelled()`. The helper routes to
`@capacitor/share` on device and to `navigator.share` on the web.

### The Android back button is not history

Android's hardware back button does nothing unless the app handles it.
`useNativeShell()` (`src/hooks/use-native-shell.ts`) maps it onto router
history, and exits the app at the root entry. The same hook themes the status
bar, hides the launch splash once auth resolves, and receives deep links.

### Standalone detection misses the shell

`isNativeAppUserAgent()` (`src/lib/utils.ts`) decides whether to skip the
marketing homepage. It tested `display-mode: standalone` and
`navigator.standalone`, and a Capacitor WebView reports neither, so it now
checks `isNativeApp` first.

## Deep links

`useNativeShell()` listens for `appUrlOpen`, sets a Supabase session from the
URL hash when one is present, and routes the rest into the app. Android already
registers the `app.sunlo.mobile://` custom scheme, so that path works today.

Getting an `https://sunlo.app/...` link to open the app — which is what a
password-reset email actually contains — needs two files served from the
domain and one change per platform:

1. `https://sunlo.app/.well-known/assetlinks.json`, carrying the release
   keystore's SHA-256 fingerprint.
2. `https://sunlo.app/.well-known/apple-app-site-association`, served as
   `application/json` with no extension.
3. An `intent-filter` for the domain in `android/app/src/main/AndroidManifest.xml`.
4. An Associated Domains entitlement for `applinks:sunlo.app` in Xcode.

Until those land, a reset link opens the mobile browser. The user resets the
password on the web and signs in again in the app, which works but is a worse
flow than it should be.

## Before a store build

- **App icons and splash screens.** Both projects still carry the Capacitor
  defaults. `pnpm dlx @capacitor/assets generate` builds every size from a
  1024×1024 source and a splash image.
- **The bundle id.** `appId` in `capacitor.config.ts` is `app.sunlo.mobile`. It
  is permanent once an app ships under it, so settle it before the first
  upload.
- **Signing.** Android needs a release keystore, referenced from
  `android/keystore.properties` — already gitignored. iOS needs a team and a
  provisioning profile in Xcode.
- **Push notifications.** Not wired. The app has an in-app notifications
  feature, and reaching the OS notification tray needs `@capacitor/push-notifications`
  plus APNs and FCM credentials.

## Known gaps

- **`localStorage` is not durable storage.** The auth session and the collection
  cache both live there, and both platforms may clear WebView storage under
  disk pressure. Losing it signs the user out and forces a full resync rather
  than corrupting anything, so it degrades safely — but `@capacitor/preferences`
  is the durable home if that becomes a real complaint.
- **Scenetest does not cover the native shell.** Scenes run against the dev
  server in a desktop browser, so nothing here exercises the WebView. The
  browser build is unaffected by these changes, which the existing suite does
  cover.
