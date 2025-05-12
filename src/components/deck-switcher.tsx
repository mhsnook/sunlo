import { ChevronsUpDown, GalleryHorizontalEnd, Plus } from 'lucide-react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	// DropdownMenuShortcut,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@/components/ui/sidebar'
import { useProfile } from '@/lib/use-profile'
import languages from '@/lib/languages'
import Callout from './ui/callout'
import { Button } from './ui/button'
import { Link } from '@tanstack/react-router'
import { Badge } from './ui/badge'

const useDeckMenuData = () => {
	const { data, isPending, error } = useProfile()
	if (isPending) return undefined
	if (error) throw Error(error.message)
	if (!data) return null

	return data.deckLanguages?.map((lang) => {
		return {
			lang,
			name: languages[lang],
			to: `/learn/$lang`,
			badge:
				(data.decksMap[lang]?.cards_active ?? 0) +
				(data.decksMap[lang]?.cards_learned ?? 0),
			params: { lang },
		}
	})
}

function NoDecks() {
	return (
		<Callout>
			<p>It seems like you're not learning any languages yet! Get started.</p>
			<Button className="mt-2 w-full" asChild>
				<Link to="/learn/add-deck">Start Learning</Link>
			</Button>
		</Callout>
	)
}

export function DeckSwitcher({ lang }: { lang?: string }) {
	const { isMobile, setOpenMobile } = useSidebar()
	const closeSidebar = () => setOpenMobile(false)
	const deckMenuData = useDeckMenuData()

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				{deckMenuData === undefined ?
					<div style={{ height: 48, width: '100%' }} />
				: deckMenuData === null ?
					<NoDecks />
				:	<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							>
								<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
									<GalleryHorizontalEnd />
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">
										{!lang ? 'Choose a deck' : languages[lang]}
									</span>
								</div>
								<ChevronsUpDown className="ml-auto" />
							</SidebarMenuButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
							align="start"
							side={isMobile ? 'bottom' : 'right'}
							sideOffset={4}
						>
							<DropdownMenuLabel className="text-muted-foreground text-xs">
								Decks
							</DropdownMenuLabel>
							{deckMenuData?.map((deck) => (
								<DropdownMenuItem
									key={deck.name}
									asChild
									className="cursor-pointer justify-between gap-2 p-2"
								>
									<Link
										to="/learn/$lang"
										params={{ lang: deck.lang }}
										onClick={closeSidebar}
									>
										{deck.name}
										<Badge variant="outline">{deck.badge} cards</Badge>
										{/*<DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>*/}
									</Link>
								</DropdownMenuItem>
							))}
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild className="cursor-pointer gap-2 p-2">
								<Link to="/learn/add-deck" onClick={closeSidebar}>
									<div className="bg-background flex size-6 items-center justify-center rounded border">
										<Plus className="size-4" />
									</div>
									<div className="text-muted-foreground font-medium">
										New deck
									</div>
								</Link>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				}
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
