export const FONT_PREF_KEY = 'sunlo-font-preference'
export const THEME_KEY = 'vite-ui-theme'

const resetListeners = new Set<() => void>()

export function onUiPrefsReset(cb: () => void): () => void {
	resetListeners.add(cb)
	return () => {
		resetListeners.delete(cb)
	}
}

export function resetUiPrefs() {
	localStorage.removeItem(FONT_PREF_KEY)
	localStorage.removeItem(THEME_KEY)
	document.body.classList.remove('font-dyslexic')
	for (const cb of resetListeners) cb()
}
