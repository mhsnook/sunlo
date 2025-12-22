import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronsUpDown, GalleryHorizontalEnd, Home, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@/components/ui/sidebar'
import { useDecks } from '@/hooks/use-deck'
import languages from '@/lib/languages'

const useDeckMenuData = () => {
	const { data } = useDecks()
	if (!data) return null

	return (data ?? [])
		.filter((deck) => !deck.archived)
		.map((deck) => {
			return {
				lang: deck.lang,
				name: languages[deck.lang],
				to: `/learn/$lang`,
				badge: deck.cards_active + deck.cards_learned,
				params: { lang: deck.lang },
			}
		})
}

const sizeStyles: CSSProperties = { height: 48, width: '100%' }

export function DeckSwitcher({ lang }: { lang?: string }) {
	const { isMobile, setClosedMobile } = useSidebar()
	const deckMenuData = useDeckMenuData()
	const languageName = lang ? languages[lang] : null

	return (
		<SidebarMenu className="rounded-2xl shadow">
			<SidebarMenuItem>
				{deckMenuData === undefined ?
					<div style={sizeStyles} />
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
										{languageName ?? 'Choose a deck'}
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
										// oxlint-disable-next-line jsx-no-new-object-as-prop
										params={{ lang: deck.lang }}
										onClick={setClosedMobile}
									>
										{deck.name}
										<Badge variant="outline">{deck.badge} cards</Badge>
									</Link>
								</DropdownMenuItem>
							))}
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild className="cursor-pointer gap-2 p-2">
								<Link to="/learn" onClick={setClosedMobile}>
									<div className="bg-background flex size-6 items-center justify-center rounded border">
										<Home />
									</div>
									<div className="text-muted-foreground font-medium">
										All decks
									</div>
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild className="cursor-pointer gap-2 p-2">
								<Link to="/learn/add-deck" onClick={setClosedMobile}>
									<div className="bg-background flex size-6 items-center justify-center rounded border">
										<Plus />
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
