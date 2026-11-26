import { cors } from 'hono/cors'

/**
 * The page origins of the Capacitor builds — not dev hosts. Android serves the
 * app from https://localhost and iOS from capacitor://localhost, and every /api
 * call from either is cross-origin. Remove one and that platform's /api calls
 * fail in the WebView.
 *
 * Every route behind this reads a Bearer token, never a cookie, so a page on
 * one of these origins gains nothing without the user's token. If a route ever
 * authenticates by cookie, revisit this list.
 */
export const NATIVE_APP_ORIGINS = ['https://localhost', 'capacitor://localhost']

export const nativeAppCors = cors({
	origin: NATIVE_APP_ORIGINS,
	// The Flue client reads this from an error response to report it.
	exposeHeaders: ['flue-error-ref'],
})
