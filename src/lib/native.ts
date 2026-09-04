import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

export const isNativeApp = Capacitor.isNativePlatform()

const configuredOrigin = import.meta.env.VITE_PUBLIC_ORIGIN as
	| string
	| undefined

/**
 * The origin to build links that leave the app — shared URLs, QR codes, and
 * the redirect on a password-reset email.
 *
 * Inside the Capacitor WebView `window.location.origin` is `https://localhost`,
 * which resolves to nothing on the recipient's device, so a native build has to
 * name its public origin instead.
 */
export const webOrigin = isNativeApp
	? (configuredOrigin ?? 'https://sunlo.app')
	: window.location.origin

export type ShareLinkData = {
	title: string
	text: string
	url?: string
}

/**
 * True when a share sheet is reachable. The Web Share API is absent from both
 * platform WebViews, so a native build has to answer this from the plugin
 * rather than from `navigator.share`.
 */
export const canShareLink = isNativeApp || typeof navigator.share === 'function'

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
