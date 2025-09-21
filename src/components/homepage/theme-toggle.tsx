import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'

import { Button } from '@/components/ui/button'
import { useCallback } from 'react'

export function ThemeToggle() {
	const { theme, setTheme } = useTheme()
	const toggle = useCallback(
		() => setTheme(theme === 'light' ? 'dark' : 'light'),
		[setTheme, theme]
	)

	return (
		<Button
			variant="ghost"
			size="icon"
			// oxlint-disable-next-line jsx-no-new-function-as-prop
			onClick={toggle}
			className="border-border/50 fixed top-6 right-6 z-50 h-12 w-12 rounded-full border bg-white/10 transition-all duration-300 hover:bg-white/20 dark:border-white/10 dark:bg-black/10 dark:hover:bg-black/20"
		>
			<Sun className="h-5 w-5 scale-100 rotate-0 text-slate-800 transition-all dark:scale-0 dark:-rotate-90 dark:text-slate-200" />
			<Moon className="absolute h-5 w-5 scale-0 rotate-90 text-slate-800 transition-all dark:scale-100 dark:rotate-0 dark:text-slate-200" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	)
}
