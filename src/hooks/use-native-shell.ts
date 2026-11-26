import { useEffect } from 'react'
import type { Register } from '@tanstack/react-router'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useTheme } from '@/components/theme-provider'
import { useGoBack } from '@/hooks/use-go-back'
import { isNativeApp } from '@/lib/platform'
import supabase from '@/lib/supabase-client'

type Router = Register['router']

const STATUS_BAR_BACKGROUND = { light: '#faf9fb', dark: '#1a1420' }

function prefersDark(theme: string) {
	if (theme === 'dark') return true
	if (theme === 'light') return false
	return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * A recovery or email-confirmation link ends at our own origin with the new
 * session in the URL hash — `access_token` and `refresh_token`, because the
 * client runs Supabase's default implicit flow. On the web supabase-js reads
 * those itself, but its `detectSessionInUrl` scan runs once when the client is
 * constructed, and a link that arrives through `appUrlOpen` never touches
 * `window.location`. So the native build has to set the session by hand.
 */
async function followDeepLink(rawUrl: string, router: Router) {
	let url: URL
	try {
		url = new URL(rawUrl)
	} catch {
		return
	}

	const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
	const access_token = hash.get('access_token')
	const refresh_token = hash.get('refresh_token')
	if (access_token && refresh_token) {
		await supabase.auth.setSession({ access_token, refresh_token })
	}

	router.history.replace(`${url.pathname}${url.search}`)
}

/**
 * Wires the status bar, the launch splash, and incoming deep links. Called
 * outside the router, so it cannot touch route state — the hardware back
 * button lives in `useNativeBackButton` for that reason. Every effect no-ops
 * in a browser.
 */
export function useNativeShell(router: Router, isReady: boolean) {
	const { theme } = useTheme()

	useEffect(() => {
		if (!isNativeApp) return
		const listener = App.addListener('appUrlOpen', ({ url }) => {
			void followDeepLink(url, router)
		})
		return () => {
			void listener.then((handle) => handle.remove())
		}
	}, [router])

	useEffect(() => {
		if (!isNativeApp) return
		const dark = prefersDark(theme)
		void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
		if (Capacitor.getPlatform() === 'android') {
			void StatusBar.setBackgroundColor({
				color: dark ? STATUS_BAR_BACKGROUND.dark : STATUS_BAR_BACKGROUND.light,
			})
		}
	}, [theme])

	useEffect(() => {
		if (!isNativeApp || !isReady) return
		void SplashScreen.hide()
	}, [isReady])
}

/**
 * Points Android's hardware back button at the same `useGoBack` the navbar
 * chevron uses, so the two never disagree. Exits the app at the entry route,
 * where the navbar would instead climb a path segment — an app that cannot be
 * backed out of traps the user.
 *
 * Must be called inside the router: `useGoBack` reads route matches.
 */
export function useNativeBackButton() {
	const { goBack, isAtEntry } = useGoBack()

	useEffect(() => {
		if (!isNativeApp) return
		const listener = App.addListener('backButton', () => {
			if (isAtEntry) void App.exitApp()
			else goBack()
		})
		return () => {
			void listener.then((handle) => handle.remove())
		}
	}, [goBack, isAtEntry])
}
