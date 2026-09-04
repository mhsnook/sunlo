import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
	appId: 'app.sunlo.mobile',
	appName: 'Sunlo',
	webDir: 'dist',
	android: {
		// The default `http` scheme makes the WebView origin http://localhost,
		// which is not a secure context — navigator.clipboard and crypto.subtle
		// both go undefined and the copy-link buttons fail silently.
		androidScheme: 'https',
	},
	ios: {
		contentInset: 'always',
	},
	plugins: {
		SplashScreen: {
			launchAutoHide: false,
			backgroundColor: '#faf9fb',
			showSpinner: false,
		},
		Keyboard: {
			resize: 'native',
			resizeOnFullScreen: true,
		},
		StatusBar: {
			overlaysWebView: false,
		},
	},
}

export default config
