import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
	appId: 'app.sunlo.mobile',
	appName: 'Sunlo',
	// Not dist/: the Cloudflare Vite plugin puts the Worker bundle there too,
	// and the app's index.html is one level down.
	webDir: 'dist/client',
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
