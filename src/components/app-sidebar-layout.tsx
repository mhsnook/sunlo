import type { ReactNode } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import {
	useState,
	createContext,
	UIEventHandler,
	ReactEventHandler,
	useMemo,
} from 'react'
import { usePrevious } from '@uidotdev/usehooks'

type ScrollStateEnum = 'initial' | 'down' | 'up' | 'same' | undefined

export const ScrollContext = createContext<ScrollStateEnum>(undefined)

export function AppSidebarLayout({ children }: { children: ReactNode }) {
	const [scrollTop, setScrollTop] = useState<{
		new: number | null
		prev: number | null
		direction: ScrollStateEnum
	}>({ new: null, prev: null, direction: 'initial' })

	console.log(`Log rendering,`, scrollTop)

	return (
		<div className="flex h-screen w-full overflow-hidden">
			<AppSidebar />
			<SidebarInset className="w-full flex-1">
				<div
					id="app-sidebar-layout-outlet"
					className="w-app @container overflow-y-auto pb-6"
					onScroll={(event) =>
						setScrollTop((prev) => {
							const prevY = prev.new
							const newY = event.target.scrollTop
							if (prevY === newY) return
							const direction =
								prevY === null ? 'initial'
								: prevY === newY ? 'same'
								: prevY < newY ? 'down'
								: prevY > newY ? 'up'
								: undefined
							return {
								prev: prevY,
								new: newY,
								direction,
							}
						})
					}
				>
					<ScrollContext.Provider value={scrollTop.direction}>
						{children}
					</ScrollContext.Provider>
				</div>
			</SidebarInset>
		</div>
	)
}
