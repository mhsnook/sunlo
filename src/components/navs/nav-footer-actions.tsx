import { Github, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'

export function NavFooterActions() {
	const { theme, setTheme } = useTheme()
	const isDark = theme === 'dark'
	const toggleTheme = () => setTheme(isDark ? 'light' : 'dark')

	return (
		<div className="flex items-center justify-between gap-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
			<a
				href="https://github.com/mhsnook/sunlo"
				target="_blank"
				rel="noreferrer"
				className="text-c-lo text-lc-5 hover:text-lc-7 flex items-center gap-2 text-xs"
				data-testid="sidebar-open-source-link"
			>
				<Github className="size-4" />
				<span>Free forever &middot; Open source</span>
			</a>
			<Button
				variant="ghost"
				size="icon"
				onClick={toggleTheme}
				aria-label="Toggle theme"
				data-testid="sidebar-theme-toggle"
			>
				{isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
			</Button>
		</div>
	)
}
