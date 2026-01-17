import {
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useState,
} from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
	children: ReactNode
	defaultTheme?: Theme
	storageKey?: string
}

type ThemeProviderState = {
	theme: Theme
	setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
	theme: 'system',
	setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
	children,
	defaultTheme = 'system',
	storageKey = 'vite-ui-theme',
	...props
}: ThemeProviderProps) {
	// Use defaultTheme for SSR, then hydrate from localStorage
	const [theme, setTheme] = useState<Theme>(defaultTheme)
	const [mounted, setMounted] = useState(false)

	// Hydrate theme from localStorage after mount (client-side only)
	useEffect(() => {
		const stored = localStorage.getItem(storageKey) as Theme | null
		if (stored) {
			setTheme(stored)
		}
		setMounted(true)
	}, [storageKey])

	useEffect(() => {
		if (!mounted) return

		const root = window.document.documentElement

		root.classList.remove('light', 'dark')

		if (theme === 'system') {
			const systemTheme =
				window.matchMedia('(prefers-color-scheme: dark)').matches ?
					'dark'
				:	'light'

			root.classList.add(systemTheme)
			return
		}

		root.classList.add(theme)
	}, [theme, mounted])

	const value = {
		theme,
		setTheme: (theme: Theme) => {
			localStorage.setItem(storageKey, theme)
			setTheme(theme)
		},
	}

	return (
		<ThemeProviderContext.Provider {...props} value={value}>
			{children}
		</ThemeProviderContext.Provider>
	)
}

export const useTheme = () => {
	const context = useContext(ThemeProviderContext)

	if (context === undefined)
		throw new Error('useTheme must be used within a ThemeProvider')

	return context
}
