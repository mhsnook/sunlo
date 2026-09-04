/**
 * Capability gates and their fallbacks: one API per browser feature the app
 * cannot assume it has. Each export answers "can we do this here?" or "do it
 * the best way available here", so component code asks once and never branches
 * on the platform itself.
 *
 * What varies is not only native-versus-web. A desktop browser without the Web
 * Share API, an insecure context with no clipboard, and the Capacitor WebView
 * are three cases of the same question, and they belong together.
 *
 * Nothing here shows UI. A gate reports and a shim executes; the toast on
 * success or failure is the caller's to write.
 */
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

/** False in every browser, true only in the Capacitor WebView. */
export const isNativeApp = Capacitor.isNativePlatform()

/**
 * Whether the app is running outside a browser tab — the native shell, or a
 * PWA launched from the home screen. Used to skip the marketing homepage for
 * someone who has already installed us.
 */
export function isInstalledApp() {
	return (
		isNativeApp ||
		('standalone' in window.navigator && window.navigator.standalone) ||
		window.matchMedia('(display-mode: standalone)').matches
	)
}

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
 * Web Share API, so the native build answers this from the plugin rather than
 * from `navigator.share`.
 */
export const canShareLink =
	isNativeApp ||
	(typeof navigator !== 'undefined' && typeof navigator.share === 'function')

/** Rejects if the sheet fails or the user dismisses it. */
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

/**
 * Copies text, and rejects if it cannot.
 *
 * `navigator.clipboard` needs a secure context, which iOS does not grant the
 * WebView's `capacitor://` origin, so this falls back to a hidden textarea and
 * the deprecated `execCommand('copy')` — still the only path that works there.
 */
export async function copyText(text: string): Promise<void> {
	if (navigator.clipboard) {
		try {
			await navigator.clipboard.writeText(text)
			return
		} catch {
			// fall through to the textarea
		}
	}

	const textarea = document.createElement('textarea')
	textarea.value = text
	document.body.appendChild(textarea)
	textarea.select()
	const copied = document.execCommand('copy')
	document.body.removeChild(textarea)
	if (!copied) throw new Error('This browser would not let us copy that')
}
