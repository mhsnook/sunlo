import { Link, useLocation } from '@tanstack/react-router'
import { Github, MessageSquareText, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'

export function NavFooterActions() {
	const { theme, setTheme } = useTheme()
	const isDark = theme === 'dark'
	const toggleTheme = () => setTheme(isDark ? 'light' : 'dark')
	const { pathname } = useLocation()

	return (
		<div className="flex flex-col gap-1 px-2 py-1 group-data-[collapsible=icon]:hidden">
			<Link
				to="/feedback"
				search={pathname === '/feedback' ? {} : { from: pathname }}
				className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700"
				data-testid="sidebar-feedback-link"
			>
				<MessageSquareText className="size-4" />
				<span>Send feedback</span>
			</Link>
			<div className="flex items-center justify-between gap-2">
				<a
					href="https://github.com/mhsnook/sunlo"
					target="_blank"
					rel="noreferrer"
					className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700"
					data-testid="sidebar-open-source-link"
				>
					<Github className="size-4" />
					<span>Free &amp; open source</span>
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
		</div>
	)
}
