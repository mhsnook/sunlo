# Native apps with Capacitor

Capacitor wraps the Vite build in a native iOS and Android shell. The whole
stack ships unchanged — React, TanStack Router, TanStack DB, Supabase realtime,
Tailwind — because a Capacitor app is the same SPA running in a system WebView.
There is no second codebase and no port.

The native projects live in `android/` and `ios/`. Both are generated, both are
checked in, and both are yours to edit: Capacitor writes them once and then
leaves them alone, so a manifest change or a signing config survives every
later `cap sync`.

## Compile the app

```bash
pnpm cap:sync            # vite build, then copy dist/client into both platforms
pnpm cap:android         # sync, then open the project in Android Studio
pnpm cap:ios             # sync, then open the project in Xcode
pnpm cap:run:android     # sync, then build and launch on a device or emulator
pnpm cap:doctor          # report what the local toolchain is missing
```

`cap sync` copies `dist/client` and re-reads the plugin list. Run it after every
`pnpm build`, after you add a plugin, and after you change
`capacitor.config.ts`. Also run it after `pnpm install` changes any
`@capacitor/*` version: `android/capacitor.settings.gradle` and
`ios/App/CapApp-SPM/Package.swift` point into `node_modules/.pnpm` by exact
version, and a stale path fails the native build. The copy is `webDir: 'dist/client'`, not `dist/`,
because the Cloudflare Vite plugin writes the Worker bundle into `dist/` too.

Android needs Android Studio and a JDK. iOS needs Xcode on a Mac. Capacitor 8
resolves iOS dependencies through Swift Package Manager, so the setup does not
need CocoaPods.

### The `.env` for a native build

The Vite build bakes three variables into a native build. `.env.example` lists
all of them.

| Variable                                         | What the native build uses it for                     | If unset                 |
| ------------------------------------------------ | ----------------------------------------------------- | ------------------------ |
| `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` | Auth, data, and realtime                              | The build drops Supabase |
| `VITE_PUBLIC_ORIGIN`                             | Links that leave the app, and auth email redirects    | `https://sunlo.app`      |
| `VITE_API_ORIGIN`                                | The Worker's `/api` routes: search, the coach, photos | `VITE_PUBLIC_ORIGIN`     |

Every value must be reachable from the phone. `localhost` inside the app means
the phone, not your computer, so `VITE_SUPABASE_URL="http://localhost:54321"`
fails on a device. Android also blocks cleartext HTTP from API 28 onward. Point
a device build at https services.

`VITE_API_ORIGIN` differs from `VITE_PUBLIC_ORIGIN` while Vercel still serves
`sunlo.app`: Vercel has no `/api` routes, and the Worker lives on
`workers.dev`. Once `sunlo.app` moves to the Worker (`docs/deployment.md`), the
fallback is correct and you can drop the variable.

## Test on a device

No automated test runs inside the WebView. Scenetest drives the dev server in a
desktop browser, so it covers the web build only. A change to the native shell
needs a run on a device or an emulator.

### Run a branch on Android

1. Set `.env` for the device:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`: the `SUPABASE_URL` and
     `SUPABASE_ANON_KEY` pair from `wrangler.jsonc` `vars`. This is
     production data, the same data the Worker Previews use, so anything you
     write is real.
   - `VITE_API_ORIGIN`: the production Worker, at
     `https://sunlo.<account-subdomain>.workers.dev`. If the branch changes
     `worker/` or `.flue/`, use the branch's Worker Preview instead, at
     `https://<branch>-sunlo.<account-subdomain>.workers.dev`. The Cloudflare
     workflow builds one for each pull request (`docs/deployment.md`).
2. Start an emulator in Android Studio, or connect a phone with USB debugging
   on.
3. Run `pnpm cap:run:android`. It builds, syncs, and asks which device to use.
   `pnpm exec cap run android --list` shows the choices first.

For iOS, run `pnpm cap:ios` and press Run in Xcode with a simulator selected.

### What to check

Each section under [What the WebView changes](#what-the-webview-changes) has a
check you can see on the device:

- **Origin.** Share a phrase and open the link on another device. It opens
  `VITE_PUBLIC_ORIGIN`, not `localhost`.
- **The Worker.** Run a semantic search, send a message to the coach, and read
  a photo. Each one returns a result, not an error toast.
- **Share sheet.** The share buttons appear, and they open the system share
  sheet. Dismiss the sheet: no error toast appears.
- **Back.** On Android, the hardware back button goes where the navbar chevron
  goes. At the first screen, it closes the app.
- **Installed-app redirect.** A cold launch goes to `/learn` when signed in,
  and to `/login` when signed out. It does not show the marketing homepage.
- **Clipboard.** Copy a link, then paste it somewhere.
- **Status bar.** Switch between light and dark theme. The status bar text
  stays readable.

### Live reload

`cap run android --live-reload --host <your-LAN-IP> --port 5173` loads the Vite
dev server in the app instead of the built files. Two parts of it do not work
yet:

- The CLI sets only `server.url`, not `server.cleartext`. Android blocks the
  http dev server, so the app does not load.
- The page origin becomes `http://<your-LAN-IP>:5173`, which `worker/cors.ts`
  does not allow. Set `VITE_API_ORIGIN` to that same address, so the Worker
  calls stay same-origin.

## What the WebView changes

Six browser assumptions in the app do not hold inside the shell. Most of the
fixes live in `src/lib/platform.ts`, which holds the app's capability gates and
their fallbacks — one API per browser feature the app cannot assume it has.

The question is wider than native-versus-web. A desktop browser with no Web
Share API, an insecure context with no clipboard, and the Capacitor WebView are
three cases of the same question, so they live together. Ask a gate
(`canShareLink`, `isInstalledApp()`) or call a shim (`shareLink()`,
`copyText()`) and let it pick the path; do not branch on `isNativeApp` at the
call site. Nothing in the module shows UI — the toast on success or failure is
the caller's to write.

### The origin is not the site

`window.location.origin` is `https://localhost` in the Android WebView and
`capacitor://localhost` in the iOS WebView. Any link built from it points at
nothing on the recipient's device, which breaks shared URLs, invite QR codes,
and the redirect on an auth email without an error.

Build outgoing links from `webOrigin` instead. A native build reads
`VITE_PUBLIC_ORIGIN`. A web build uses `window.location.origin`, so preview
deploys still share their own URL.

Links that stay inside the app, such as router `<Link>`s, need no change.

### The Worker is not behind localhost

Search, the coach, and photo reading call the Worker's `/api` routes. On the
web, those calls are same-origin. In the WebView, a relative `/api/search`
resolves to `https://localhost/api/search`, where no Worker runs.

Build Worker URLs with `apiUrl()` from `src/lib/platform.ts`. A native build
points it at `VITE_API_ORIGIN`. `postWorkerApi()` and the coach client already
use it.

An absolute URL is cross-origin from the WebView, so the Worker must allow the
two WebView origins. `worker/cors.ts` lists them, and `.flue/app.ts` applies
the rule ahead of every `/api` route. Every route there reads a Bearer token,
not a cookie, so the rule grants nothing to a page that has no token. If a
route ever authenticates by cookie, revisit the list.

### The Web Share API is absent

Neither platform WebView implements `navigator.share`, so every share button
that gated on it hid itself in the native build. Share through `shareLink()`,
gate on `canShareLink`, and swallow a dismissed sheet with
`isShareCancelled()`. The helper routes to `@capacitor/share` on device and to
`navigator.share` on the web.

### The Android hardware back button does nothing by default

Android's hardware back button does nothing unless the app handles it. The
navbar chevron already carries the app's definition of "back": a route can name
its own destination through `titleBar.onBackClick`, otherwise the button pops
history, otherwise it climbs one path segment.

`useGoBack()` (`src/hooks/use-go-back.ts`) holds that logic, and both buttons
call it, so the two never disagree. The one difference is the third case:
`useNativeBackButton()` exits the app where the chevron climbs a segment,
because an app you cannot back out of traps the user.

The hooks split by router context. `useNativeBackButton()` reads route matches,
so `RootComponent` calls it inside the router. `useNativeShell()` themes the
status bar, hides the launch splash once auth resolves, and receives deep
links. None of that needs route state, so `src/routes.tsx` calls it, and it
still runs when the router never mounts.

### Installed-app detection misses the shell

The homepage redirect skips the marketing page for someone who already
installed us. It tested `display-mode: standalone` and `navigator.standalone`,
and a Capacitor WebView reports neither, so the landing page opened inside the
app. It now asks `isInstalledApp()`, which checks the shell first.

### The clipboard is not always there

`navigator.clipboard` exists only in a secure context. That excludes the dev
server opened on a phone through `vite --host` over http. A browser can also
refuse a write. In both cases, `copyText()` falls back to a hidden textarea and
`execCommand('copy')`.

The WebView origins themselves should be secure contexts. Android's
`https://localhost` is one, and a WebKit bug report describes
`window.isSecureContext` as true under `capacitor://localhost`. Nobody has
confirmed either on a device for this app yet, so the **Clipboard** check above
matters on iOS.

## Deep links

`useNativeShell()` listens for `appUrlOpen`, sets a Supabase session from the
URL hash when one is present, and routes the rest into the app.

The handler is inert for now. Neither platform registers a link that opens the
app: the Android manifest has only the launcher intent filter, and the iOS
`Info.plist` has no URL types. `strings.xml` defines a `custom_url_scheme`, but
nothing uses it.

The hash carries `access_token` and `refresh_token` because the client runs
Supabase's default implicit flow. On the web supabase-js reads them itself, but
its `detectSessionInUrl` scan runs once when the client is constructed. A link
that arrives through `appUrlOpen` never touches `window.location`, so the
native build calls `setSession` by hand. Moving the client to the PKCE flow
would change this to a `?code=` query and `exchangeCodeForSession`.

A password-reset email contains an `https://sunlo.app/...` link. For that link
to open the app, you need two files on the domain and one change per platform:

1. `https://sunlo.app/.well-known/assetlinks.json`, carrying the release
   keystore's SHA-256 fingerprint.
2. `https://sunlo.app/.well-known/apple-app-site-association`, served as
   `application/json` with no extension.
3. An `intent-filter` for the domain in `android/app/src/main/AndroidManifest.xml`.
4. An Associated Domains entitlement for `applinks:sunlo.app` in Xcode.

Until those land, a reset link opens the mobile browser. The user resets the
password on the web and signs in again in the app. That works, but it is a
worse flow than it should be.

## Before a store build

- **App icons and splash screens.** Both projects still carry the Capacitor
  defaults. `pnpm dlx @capacitor/assets generate` builds every size from a
  1024×1024 source and a splash image.
- **The bundle id.** `appId` in `capacitor.config.ts` is `app.sunlo.mobile`.
  You cannot change it after an app ships under it, so settle it before the
  first upload.
- **Signing.** Android needs a release keystore, referenced from
  `android/keystore.properties`, which `.gitignore` already excludes. iOS needs
  a team and a provisioning profile in Xcode.
- **Push notifications.** Not wired. The app has an in-app notifications
  feature. To reach the OS notification tray, it needs
  `@capacitor/push-notifications` plus APNs and FCM credentials.

## Known gaps

- **`localStorage` is not durable storage.** The auth session and the collection
  cache both live there, and both platforms can clear WebView storage when the
  device runs low on disk. Losing it signs the user out and forces a full
  resync, but it corrupts nothing. `@capacitor/preferences` is the durable home
  if that becomes a real complaint.
