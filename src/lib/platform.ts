/**
 * Shims for the handful of browser APIs that behave differently inside the
 * Capacitor WebView. Every export here works on both platforms — call these
 * from ordinary component code and never branch on `isNativeApp` at the call
 * site.
 */
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

export const isNativeApp = Capacitor.isNativePlatform()

const configuredOrigin = import.meta.env.VITE_PUBLIC_ORIGIN as
	| string
	| undefined

const FALLBACK_ORIGIN = 'https://sunlo.app'

/**
 * The origin for links that LEAVE the app — shared URLs, QR codes, and the
 * redirect on an auth email.
 *
 * `window.location.origin` is `https://localhost` inside the WebView, which
 * resolves to nothing on the recipient's device, so a native build reads
 * VITE_PUBLIC_ORIGIN instead and falls back to the production site. On the web
 * this is `window.location.origin`, so a preview deploy still shares itself.
 *
 * Reached through `globalThis` because vitest runs these modules in Node,
 * where a bare `window` is a ReferenceError rather than undefined.
 */
export const webOrigin = isNativeApp
	? (configuredOrigin ?? FALLBACK_ORIGIN)
	: (globalThis.location?.origin ?? configuredOrigin ?? FALLBACK_ORIGIN)

export type ShareLinkData = {
	title: string
	text: string
	url?: string
}

/**
 * Whether a share sheet is reachable. Neither platform WebView implements the
 * Web Share API, so a native build has to answer this from the plugin rather
 * than from `navigator.share`.
 */
export const canShareLink =
	isNativeApp ||
	(typeof navigator !== 'undefined' && typeof navigator.share === 'function')

export async function shareLink(data: ShareLinkData): Promise<void> {
	if (isNativeApp) {
		await Share.share({ ...data, dialogTitle: data.title })
		return
	}
	await navigator.share(data)
}

/** Dismissing the share sheet rejects, and is not a failure worth a toast. */
export function isShareCancelled(error: unknown): boolean {
	if (error instanceof DOMException && error.name === 'AbortError') return true
	return error instanceof Error && /cancel/i.test(error.message)
}
