import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import { useLiveQuery } from '@tanstack/react-db'
import {
	ChevronsUpDown,
	GalleryHorizontalEnd,
	Globe,
	Home,
	Plus,
	Users,
} from 'lucide-react'
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
import { useAuth } from '@/lib/use-auth'
import { languagesCollection } from '@/lib/collections'
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
	const { isAuth } = useAuth()

	if (!isAuth) {
		return <LanguageBrowser lang={lang} />
	}

	return <AuthenticatedDeckSwitcher lang={lang} />
}

function AuthenticatedDeckSwitcher({ lang }: { lang?: string }) {
	const { isMobile, setClosedMobile } = useSidebar()
	const deckMenuData = useDeckMenuData()
	const languageName = lang ? languages[lang] : null

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				{deckMenuData === undefined ?
					<div style={sizeStyles} />
				:	<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-xl shadow"
							>
								<div className="bg-primary-foresoft text-sidebar-primary-foreground rounded-squircle flex aspect-square size-8 items-center justify-center rounded-xl">
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

function LanguageBrowser({ lang }: { lang?: string }) {
	const { isMobile, setClosedMobile } = useSidebar()
	const { data: allLanguages } = useLiveQuery((q) =>
		q
			.from({ lang: languagesCollection })
			.orderBy(({ lang }) => lang.learners, 'desc')
	)
	const languageName = lang ? languages[lang] : null

	const topLanguages = allLanguages?.slice(0, 10) ?? []
	const otherLanguages = allLanguages?.slice(10) ?? []

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-xl shadow"
						>
							<div className="bg-primary-foresoft text-sidebar-primary-foreground rounded-squircle flex aspect-square size-8 items-center justify-center rounded-xl">
								<Globe />
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">
									{languageName ?? 'Browse a language'}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="max-h-[60vh] w-(--radix-dropdown-menu-trigger-width) min-w-56 overflow-y-auto rounded-lg"
						align="start"
						side={isMobile ? 'bottom' : 'right'}
						sideOffset={4}
					>
						<DropdownMenuLabel className="text-muted-foreground text-xs">
							Popular Languages
						</DropdownMenuLabel>
						{topLanguages.map((langItem) => (
							<DropdownMenuItem
								key={langItem.lang}
								asChild
								className="cursor-pointer justify-between gap-2 p-2"
							>
								<Link
									to="/learn/$lang/feed"
									params={{ lang: langItem.lang }}
									onClick={setClosedMobile}
								>
									{langItem.name}
									<Badge variant="outline" className="gap-1">
										<Users className="size-3" />
										{langItem.learners?.toLocaleString() ?? 0}
									</Badge>
								</Link>
							</DropdownMenuItem>
						))}
						{otherLanguages.length > 0 && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuLabel className="text-muted-foreground text-xs">
									All Languages
								</DropdownMenuLabel>
								{otherLanguages.map((langItem) => (
									<DropdownMenuItem
										key={langItem.lang}
										asChild
										className="cursor-pointer justify-between gap-2 p-2"
									>
										<Link
											to="/learn/$lang/feed"
											params={{ lang: langItem.lang }}
											onClick={setClosedMobile}
										>
											{langItem.name}
											<Badge variant="outline" className="gap-1">
												<Users className="size-3" />
												{langItem.learners?.toLocaleString() ?? 0}
											</Badge>
										</Link>
									</DropdownMenuItem>
								))}
							</>
						)}
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild className="cursor-pointer gap-2 p-2">
							<Link to="/learn/browse" onClick={setClosedMobile}>
								<div className="bg-background flex size-6 items-center justify-center rounded border">
									<Home />
								</div>
								<div className="text-muted-foreground font-medium">
									Browse all
								</div>
							</Link>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
