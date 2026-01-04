import { Check, ChevronsUpDown, MonitorCog, Moon, Sun } from 'lucide-react'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/components/theme-provider'
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@/components/ui/sidebar'
import { useCallback } from 'react'

export function ModeToggle() {
	const { theme, setTheme } = useTheme()
	const { isMobile } = useSidebar()
	const setLight = useCallback(() => setTheme('light'), [setTheme])
	const setDark = useCallback(() => setTheme('dark'), [setTheme])
	const setSystem = useCallback(() => setTheme('system'), [setTheme])

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-xl shadow group-data-[collapsible=icon]:p-2!"
						>
							<Sun className="h-[1.3rem] w-[1.3rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
							<Moon className="absolute h-[1.3rem] w-[1.3rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
							<span>
								<span className="capitalize">{theme}</span> mode
							</span>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>

					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
						side={isMobile ? 'bottom' : 'right'}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuItem
							className={theme === 'light' ? 'bg-primary/10' : ''}
							onClick={setLight}
						>
							{theme === 'light' ?
								<Check className="mr-2 size-4" />
							:	<Sun className="mr-2 size-4" />}
							Light
						</DropdownMenuItem>
						<DropdownMenuItem
							className={theme === 'dark' ? 'bg-primary/10' : ''}
							onClick={setDark}
						>
							{theme === 'dark' ?
								<Check className="mr-2 size-4" />
							:	<Moon className="mr-2 size-4" />}
							Dark
						</DropdownMenuItem>
						<DropdownMenuItem
							className={theme === 'system' ? 'bg-primary/10' : ''}
							onClick={setSystem}
						>
							{theme === 'system' ?
								<Check className="mr-2 size-4" />
							:	<MonitorCog className="mr-2 size-4" />}
							System
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
