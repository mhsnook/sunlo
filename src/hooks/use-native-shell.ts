import { useEffect } from 'react'
import type { Register } from '@tanstack/react-router'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useTheme } from '@/components/theme-provider'
import { isNativeApp } from '@/lib/native'
import supabase from '@/lib/supabase-client'

type Router = Register['router']

const STATUS_BAR_BACKGROUND = { light: '#faf9fb', dark: '#1a1420' }

function prefersDark(theme: string) {
	if (theme === 'dark') return true
	if (theme === 'light') return false
	return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * A deep link into the app carries its Supabase tokens in the hash, and the
 * client has already finished its own URL scan by the time the link arrives —
 * so the session has to be set here before the route renders.
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
 * Wires the parts of the native shell that have no web equivalent: the Android
 * hardware back button, the status bar, the launch splash, and incoming deep
 * links. Every effect no-ops in a browser.
 */
export function useNativeShell(router: Router, isReady: boolean) {
	const { theme } = useTheme()

	useEffect(() => {
		if (!isNativeApp) return
		const listener = App.addListener('backButton', ({ canGoBack }) => {
			if (canGoBack) router.history.back()
			else void App.exitApp()
		})
		return () => {
			void listener.then((handle) => handle.remove())
		}
	}, [router])

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
