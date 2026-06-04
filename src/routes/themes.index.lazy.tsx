import {
	useEffect,
	useId,
	useState,
	type CSSProperties,
	type ReactNode,
} from 'react'
import { useLiveQuery } from '@tanstack/react-db'
import { createLazyFileRoute } from '@tanstack/react-router'
import { gt } from '@tanstack/db'
import {
	BookA,
	Bookmark,
	Check,
	ChevronDown,
	ChevronsUpDown,
	HeartPlus,
	Info,
	Lightbulb,
	ListFilter,
	ListPlus,
	Logs,
	Mail,
	MessageCircleHeart,
	MessageCircleWarningIcon,
	MessageSquare,
	MessageSquareQuote,
	MonitorCog,
	Moon,
	MoreVertical,
	Reply,
	Rocket,
	Send,
	Settings,
	Share2,
	Star,
	Sun,
	TableProperties,
	ThumbsUp,
	UserCheck,
	X,
	type LucideIcon,
} from 'lucide-react'
import { allLanguageOptions } from '@/lib/languages'
import {
	getLangHue,
	getLangHueIndex,
	getLangPopularityIndex,
	LANG_HUES,
} from '@/lib/lang-theme'
import { cn } from '@/lib/utils'
import { languagesCollection } from '@/features/languages/collections'
import { Badge, LangBadge } from '@/components/ui/badge'
import { statusStrings } from '@/components/card-pieces/card-status-dropdown'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
	SelectFriendsToShareDialog,
	SharePreviewChip,
} from '@/components/select-friends-to-share'
import type { RelationsFullType } from '@/features/social/live'
import Callout from '@/components/ui/callout'
import { ChoiceTile } from '@/components/ui/choice-tile'
import { DestructiveOctagon } from '@/components/ui/destructive-octagon-badge'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '@/components/ui/command'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { CardlikeFlashcard, CardlikeRequest } from '@/components/ui/card-like'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
	toastError,
	toastInfo,
	toastNeutral,
	toastSuccess,
} from '@/components/ui/sonner'
import { Markdown } from '@/components/my-markdown'

export const Route = createLazyFileRoute('/themes/')({
	component: ThemesPage,
})

// Made-up language code + content so the showcase needs no real data.
const SHOWCASE_LANG = 'sun'

const REQUEST_PROMPT = `I'm visiting a friend's grandparents next week and want to greet them politely. How would I say:

> Good evening — it's an honour to meet you.

in a respectful, formal register?`

const ANSWER_PHRASES = [
	{ text: 'selamat sonja', translation: 'good evening' },
	{ text: 'suka berkenal', translation: "it's an honour to meet you" },
]

const REVIEW_TRANSLATIONS = ['good evening', 'an evening greeting']

const ANSWER_CHOICES = [
	{
		label: 'Again',
		interval: '8 min',
		cls: 'rounded-s-2xl border-red-600! bg-red-600! text-white',
	},
	{
		label: 'Hard',
		interval: '2 days',
		cls: 'border-gray-200! bg-gray-200! text-gray-700!',
	},
	{
		label: 'Good',
		interval: '5 days',
		cls: 'border-green-500! bg-green-500! text-white',
	},
	{
		label: 'Easy',
		interval: '11 days',
		cls: 'rounded-e-2xl border-blue-500 bg-blue-500! text-white',
	},
]

function Byline({
	initials,
	name,
	action,
	time,
	size = 'lg',
}: {
	initials: string
	name: string
	action: string
	time: string
	size?: 'lg' | 'sm'
}) {
	if (size === 'sm')
		return (
			<div className="inline-flex flex-row items-center gap-2">
				<Avatar className="bg-foreground text-background h-6 w-6 rounded-lg">
					<AvatarFallback seed={name} className="text-[10px] font-bold">
						{initials}
					</AvatarFallback>
				</Avatar>
				<div className="flex flex-row items-center gap-1.5 text-sm">
					<span className="font-medium">{name}</span>
					<span className="text-muted-foreground">
						{action} / <time>{time}</time>
					</span>
				</div>
			</div>
		)
	return (
		<div className="flex flex-row items-center gap-3">
			<Avatar className="bg-foreground text-background rounded-2xl">
				<AvatarFallback seed={name} className="font-bold">
					{initials}
				</AvatarFallback>
			</Avatar>
			<div className="text-sm">
				<span className="font-medium">{name}</span>
				<div className="text-muted-foreground">
					{action} <time>{time}</time>
				</div>
			</div>
		</div>
	)
}

// Mirrors CardStatusHeart — a bookmark that lights up when the phrase
// is in your deck. Local state only for the showcase.
function BookmarkToggle() {
	const [saved, setSaved] = useState(false)
	return (
		<Button
			variant={saved ? 'soft' : 'ghost'}
			size="icon"
			aria-pressed={saved}
			aria-label={saved ? 'Remove from deck' : 'Add to deck'}
			onClick={() => setSaved((v) => !v)}
		>
			<Bookmark
				className={
					saved ? 'text-primary fill-current/50' : 'text-muted-foreground'
				}
			/>
		</Button>
	)
}

// A ghost button that lights up to `soft` when active — the standard
// ghost→soft toggle pattern, used here for upvotes.
function UpvoteButton({
	count,
	defaultVoted = false,
}: {
	count: number
	defaultVoted?: boolean
}) {
	const [voted, setVoted] = useState(defaultVoted)
	return (
		<Button
			variant={voted ? 'soft' : 'ghost'}
			size="sm"
			aria-pressed={voted}
			onClick={() => setVoted((v) => !v)}
		>
			<ThumbsUp className="me-1 size-4" />
			{count + (voted ? 1 : 0)}
		</Button>
	)
}

function AnswerCard({
	text,
	translation,
}: {
	text: string
	translation: string
}) {
	return (
		<CardlikeFlashcard className="flex max-w-120 flex-row gap-2 py-0 ps-4 pe-1">
			<div className="grow py-6">
				<div className="space-x-2 pb-2">
					<LangBadge lang={SHOWCASE_LANG} />
					<h4 className="inline-flex gap-2 align-baseline font-semibold">
						&ldquo;{text}&rdquo;
					</h4>
				</div>
				<ul className="mt-2 space-y-1">
					<li className="flex items-center gap-2 text-sm">
						<LangBadge lang="eng" />
						<span>{translation}</span>
					</li>
				</ul>
			</div>
			<div className="flex flex-col gap-2 px-4 py-4">
				<BookmarkToggle />
			</div>
		</CardlikeFlashcard>
	)
}

function ReplyItem({
	initials,
	name,
	time,
	content,
}: {
	initials: string
	name: string
	time: string
	content: string
}) {
	return (
		<div className="mt-2 py-2">
			<Byline
				size="sm"
				initials={initials}
				name={name}
				action="replied"
				time={time}
			/>
			<div className="ms-8 mt-1">
				<Markdown>{content}</Markdown>
			</div>
			<div className="text-muted-foreground ms-8 mt-2 flex items-center gap-2">
				<UpvoteButton count={1} />
			</div>
		</div>
	)
}

function ShowcaseRequestThread() {
	return (
		<div className="space-y-4" data-testid="showcase-request">
			<CardlikeRequest>
				<CardHeader className="border-2-lo-primary py-3 @md:py-6">
					<div className="flex flex-row items-center justify-between gap-2">
						<Byline
							initials="PL"
							name="Priya L."
							action="posted a Request"
							time="3 days ago"
						/>
						<LangBadge lang={SHOWCASE_LANG} />
					</div>
					<CardDescription className="sr-only">
						A request for assistance, and a comments thread for other users to
						discuss and answer with comments, flash card recommendations, or
						both.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					<div className="inline-flex flex-row gap-2">
						<Badge variant="outline">Greetings</Badge>
						<Badge variant="outline">Formal register</Badge>
					</div>
					<div className="text-lg">
						<Markdown>{REQUEST_PROMPT}</Markdown>
					</div>
				</CardContent>
				<CardFooter className="flex flex-col gap-4 border-t py-4">
					<div className="flex w-full flex-row items-center gap-2">
						<Avatar className="bg-foreground text-background h-8 w-8 shrink-0 rounded-lg">
							<AvatarFallback
								seed="showcase-self"
								className="text-[10px] font-bold"
							>
								You
							</AvatarFallback>
						</Avatar>
						<p className="bg-card/50 text-muted-foreground/70 w-full rounded-xl border px-2 py-1.5 pe-6 text-start text-sm shadow-xs inset-shadow-sm">
							Add a comment or suggest a card...
						</p>
					</div>
					<div className="text-muted-foreground flex w-full flex-wrap items-center gap-4 text-sm">
						<span className="flex items-center gap-1">
							<ThumbsUp className="size-4" /> 4
						</span>
						<span className="flex items-center gap-1">
							<MessageSquare className="size-4" /> 2 comments
						</span>
						<span className="flex items-center gap-1">
							<Mail className="size-4" /> 2 answers
						</span>
						<Share2 className="ms-auto size-4" />
					</div>
				</CardFooter>
			</CardlikeRequest>

			<div className="divide-y border">
				{/* A comment that answers with two suggested flashcards */}
				<div className="p-4">
					<Byline
						size="sm"
						initials="MR"
						name="Marco R."
						action="commented"
						time="2 days ago"
					/>
					<div className="mt-2">
						<Markdown>
							{
								"Two phrases cover this nicely — the first is the everyday polite greeting, the second adds the warmth you're after."
							}
						</Markdown>
					</div>
					<div className="mt-3 space-y-2">
						{ANSWER_PHRASES.map((p) => (
							<AnswerCard
								key={p.text}
								text={p.text}
								translation={p.translation}
							/>
						))}
					</div>
					<div className="text-muted-foreground mt-3 flex items-center gap-4 text-sm">
						<UpvoteButton count={6} defaultVoted />
						<Button variant="ghost" size="sm">
							<Reply className="me-1 size-4" /> Reply
						</Button>
					</div>
				</div>

				{/* A comment with a couple of replies */}
				<div className="p-4">
					<Byline
						size="sm"
						initials="TK"
						name="Theo K."
						action="commented"
						time="1 day ago"
					/>
					<div className="mt-2">
						<Markdown>
							{
								"Don't forget the small head-bow when you say it — register is carried as much by the gesture as by the words here."
							}
						</Markdown>
					</div>
					<div className="text-muted-foreground mt-3 flex items-center gap-4 text-sm">
						<UpvoteButton count={3} />
						<Button variant="soft" size="sm">
							<ChevronDown className="me-1 size-4" /> 2 replies
						</Button>
					</div>
					<div className="mt-3 space-y-2 text-sm">
						<Separator />
						<div className="divide-y">
							<ReplyItem
								initials="PL"
								name="Priya L."
								time="1 day ago"
								content="Good to know. Is the head-bow expected with grandparents specifically, or with anyone older?"
							/>
							<ReplyItem
								initials="MR"
								name="Marco R."
								time="22 hours ago"
								content="Anyone clearly older than you — but especially grandparents."
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

function ShowcaseDeckDialog() {
	return (
		<div
			className="bg-card grid max-w-md gap-4 rounded border p-6 shadow-lg"
			data-testid="showcase-deck-dialog"
		>
			<div className="flex flex-col space-y-1.5 border-b pb-4">
				<h3 className="text-foreground/90 text-lg leading-none font-semibold tracking-tight">
					Sunese
				</h3>
				<p className="text-muted-foreground text-sm">
					<span className="text-primary-foresoft font-medium">
						24 cards due
					</span>
					{' · '}83 total
				</p>
			</div>

			<div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
				<div className="from-5-mhi-primary to-6-mid-primary text-primary-foreground flex h-full flex-col items-start gap-2 rounded-2xl bg-gradient-to-br p-4 shadow">
					<Rocket className="size-6" />
					<div>
						<div className="text-base leading-tight font-semibold">
							Daily practice
						</div>
						<div className="text-primary-foreground/80 text-xs">
							24 cards ready
						</div>
					</div>
				</div>
				<div className="border-2-lo-primary bg-1-mlo-primary text-primary-foresoft flex h-full flex-col items-start gap-2 rounded-2xl border p-4 shadow">
					<Logs className="size-6" />
					<div>
						<div className="text-base leading-tight font-semibold">
							Browse deck
						</div>
						<div className="text-muted-foreground text-xs">
							Feed, phrases, stats & settings
						</div>
					</div>
				</div>
			</div>

			<nav
				aria-label="Deck quick links"
				className="flex flex-wrap gap-x-4 gap-y-2 px-2 pt-1 text-sm"
			>
				<span className="s-link">Manage Cards</span>
				<span className="s-link">New Phrase</span>
				<span className="s-link">Stats</span>
				<span className="s-link">Search</span>
				<span className="s-link">Settings</span>
			</nav>
		</div>
	)
}

function ShowcaseReviewCard() {
	return (
		<div
			className="mx-auto flex max-w-160 flex-col gap-2"
			data-testid="showcase-review-card"
		>
			<CardlikeFlashcard className="flex w-full flex-col">
				<CardContent className="relative flex flex-col items-center justify-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						aria-label="Open context menu"
						className="absolute end-4 top-4"
						disabled
					>
						<MoreVertical />
					</Button>
					<Badge
						variant="outline"
						className="absolute start-4 top-4 gap-1 text-xs"
					>
						Recognition <Lightbulb className="size-3" />
					</Badge>
					<div className="pt-16">
						<div className="text-center text-2xl font-bold">
							&ldquo;selamat sonja&rdquo;
						</div>
					</div>
					<Separator />
					<div className="w-full space-y-3">
						<h3 className="text-muted-foreground text-center text-sm font-medium tracking-wide uppercase">
							Translations
						</h3>
						{REVIEW_TRANSLATIONS.map((t) => (
							<div key={t} className="flex items-center justify-center gap-2">
								<LangBadge lang="eng" />
								<div className="text-lg">{t}</div>
							</div>
						))}
					</div>
				</CardContent>
			</CardlikeFlashcard>

			<div className="grid w-full grid-cols-4">
				{ANSWER_CHOICES.map((c) => (
					<Button
						key={c.label}
						variant="default"
						className={cn(
							'h-auto w-full flex-col gap-0 rounded-none py-2',
							c.cls
						)}
					>
						<span>{c.label}</span>
						<span className="text-xs font-normal opacity-80">{c.interval}</span>
					</Button>
				))}
			</div>
		</div>
	)
}

// Ghost button that toggles to its lit `soft` state — same pattern as
// the upvote buttons in the request thread.
function HighlightToggleButton() {
	const [active, setActive] = useState(true)
	return (
		<Button
			variant={active ? 'soft' : 'ghost'}
			size="sm"
			aria-pressed={active}
			onClick={() => setActive((v) => !v)}
		>
			Highlight
		</Button>
	)
}

function ShowcaseButtonsAndType() {
	return (
		<div
			className="bg-card max-w-md space-y-5 rounded border p-5 shadow-lg"
			data-testid="showcase-buttons-type"
		>
			<div className="space-y-2">
				<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
					Button variants
				</p>
				<div className="flex flex-wrap gap-2">
					<Button size="sm">Primary</Button>
					<Button size="sm" variant="soft">
						Primary soft
					</Button>
					<Button size="sm" variant="neutral">
						Neutral
					</Button>
					<HighlightToggleButton />
					<Button size="sm" variant="red">
						Red
					</Button>
					<Button size="sm" variant="red-soft">
						Red soft
					</Button>
				</div>
			</div>
			<Separator />
			<div className="space-y-2">
				<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
					Toasts
				</p>
				<div className="flex flex-wrap gap-2">
					<Button
						size="sm"
						variant="soft"
						onClick={() => toastSuccess('Saved — your changes are in.')}
					>
						Success
					</Button>
					<Button
						size="sm"
						variant="soft"
						onClick={() => toastInfo('Heads up — here is some context.')}
					>
						Info
					</Button>
					<Button
						size="sm"
						variant="soft"
						onClick={() => toastError('Something went wrong. Try again.')}
					>
						Error
					</Button>
					<Button
						size="sm"
						variant="soft"
						onClick={() => toastNeutral('A plain, no-icon message.')}
					>
						Neutral
					</Button>
				</div>
			</div>
			<Separator />
			<div className="space-y-1.5">
				<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
					Type scale
				</p>
				<p className="text-2xl font-bold">Display heading</p>
				<p className="text-xl">Section heading</p>
				<p className="text-base">
					Body copy at the base size — the default for reading.
				</p>
				<p className="text-sm">Small print for captions and metadata.</p>
				<p className="text-muted-foreground text-sm">
					Muted grey for secondary, lower-priority text.
				</p>
				<p className="text-base">
					A base line with <span className="font-bold">bold</span> emphasis.
				</p>
			</div>
		</div>
	)
}

// Showcase twin of CardStatusDropdown — the real component
// (src/components/card-pieces/card-status-dropdown.tsx) depends on auth + deck
// data, so we render the trigger across its visual states and reuse the
// exported `statusStrings` map for the menu copy.
type ShowableActions = 'active' | 'learned' | 'skipped' | 'nocard' | 'nodeck'

const cardStatusShowcaseStates: Array<{
	choice: ShowableActions
	dot: string
	soft?: boolean
}> = [
	{ choice: 'active', dot: 'bg-primary', soft: true },
	{ choice: 'learned', dot: 'bg-5-hi-success' },
	{ choice: 'skipped', dot: 'bg-4-lo-neutral' },
	{ choice: 'nocard', dot: 'bg-3-lo-neutral' },
	{ choice: 'nodeck', dot: 'bg-3-lo-neutral' },
]

function CardStatusMenuItem({ choice }: { choice: ShowableActions }) {
	const { Icon, iconClassName, action, actionSecond } = statusStrings[choice]
	return (
		<DropdownMenuItem>
			<div className="flex flex-row items-center gap-2 py-1 pe-2">
				<span className="h-5 w-5">
					<Icon className={iconClassName} aria-hidden="true" />
				</span>
				<div>
					<p className="font-bold">{action}</p>
					<p className="text-opacity-80 text-sm">{actionSecond}</p>
				</div>
			</div>
		</DropdownMenuItem>
	)
}

function CardStatusShowcaseTrigger({
	choice,
	dot,
	soft,
}: {
	choice: ShowableActions
	dot: string
	soft?: boolean
}) {
	const { name } = statusStrings[choice]
	// `nocard` collapses the menu to a single "Add to deck" item, matching
	// the real CardStatusDropdown behaviour.
	const items: ShowableActions[] =
		choice === 'nocard' || choice === 'nodeck'
			? [choice]
			: ['active', 'learned', 'skipped']
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant={soft ? 'soft' : 'ghost'}
						size="sm"
						aria-label={`Card status: ${name}`}
					/>
				}
			>
				<span
					aria-hidden="true"
					className={`size-2 shrink-0 rounded-full ${dot}`}
				/>
				<span>{name}</span>
				<ChevronDown className="opacity-60" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				{items.map((c) => (
					<CardStatusMenuItem key={c} choice={c} />
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

// Static, non-portal twin of DropdownMenuContent + DropdownMenuItem so we can
// show the menu's open state in the showcase without mounting a real open
// DropdownMenu (which would trap focus + scroll-lock the page on mount).
// Styles mirror src/components/ui/dropdown-menu.tsx — keep in sync.
function StaticCardStatusPopup({ items }: { items: Array<ShowableActions> }) {
	return (
		<div
			aria-hidden="true"
			className="bg-popover text-popover-foreground inline-block min-w-[8rem] overflow-hidden rounded-xl border p-1 shadow-md"
		>
			{items.map((choice) => {
				const { Icon, iconClassName, action, actionSecond } =
					statusStrings[choice]
				return (
					<div
						key={choice}
						className="relative flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm select-none"
					>
						<div className="flex flex-row items-center gap-2 py-1 pe-2">
							<span className="h-5 w-5">
								<Icon className={iconClassName} aria-hidden="true" />
							</span>
							<div>
								<p className="font-bold">{action}</p>
								<p className="text-opacity-80 text-sm">{actionSecond}</p>
							</div>
						</div>
					</div>
				)
			})}
		</div>
	)
}

function ShowcaseCardStatusDropdown() {
	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				{cardStatusShowcaseStates.map((s) => (
					<CardStatusShowcaseTrigger
						key={s.choice}
						choice={s.choice}
						dot={s.dot}
						soft={s.soft}
					/>
				))}
			</div>
			<StaticCardStatusPopup items={['active', 'learned', 'skipped']} />
		</div>
	)
}

function ShowcaseTabsList() {
	const tabs = [
		{ value: 'requests', label: 'Requests', Icon: MessageCircleHeart },
		{ value: 'phrases', label: 'Phrases', Icon: MessageSquareQuote },
		{ value: 'playlists', label: 'Playlists', Icon: Logs },
		{ value: 'comments', label: 'Comments', Icon: MessageSquare },
	]
	return (
		<Tabs defaultValue="requests">
			<TabsList>
				{tabs.map(({ value, label, Icon }) => (
					<TabsTrigger key={value} value={value}>
						<Icon className="me-1 size-4" />
						{label}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	)
}

const deckContextMenuItems: Array<{ label: string; Icon: LucideIcon }> = [
	{ label: 'Manage Deck', Icon: TableProperties },
	{ label: 'Request a Phrase', Icon: MessageCircleHeart },
	{ label: 'Add a Phrase', Icon: MessageSquareQuote },
	{ label: 'New Playlist', Icon: ListPlus },
	{ label: 'Deck Settings', Icon: Settings },
]

function ShowcaseContextMenu() {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={<Button variant="ghost" size="icon" aria-label="Open menu" />}
			>
				<MoreVertical />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				{deckContextMenuItems.map(({ label, Icon }) => (
					<DropdownMenuItem key={label}>
						<Icon className="size-5" />
						{label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

const feedFilterShowcaseOptions = [
	['all', 'All types'],
	['request', 'Requests'],
	['playlist', 'Playlists'],
	['phrase', 'New Phrases'],
] as const

function ShowcaseFilterMenu() {
	const [active, setActive] = useState<string>('all')
	const activeLabel =
		feedFilterShowcaseOptions.find(([v]) => v === active)?.[1] ?? 'All types'
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="sm"
						aria-label="Filter feed content"
						className="text-muted-foreground gap-1 text-xs"
					/>
				}
			>
				<ListFilter className="size-3.5" />
				{activeLabel}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>Show content type</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{feedFilterShowcaseOptions.map(([value, label]) => (
					<DropdownMenuItem key={value} onClick={() => setActive(value)}>
						<Check className={active === value ? 'opacity-100' : 'opacity-0'} />
						{label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

function ShowcaseCallouts() {
	return (
		<div className="space-y-3">
			<Callout variant="default" size="sm" Icon={HeartPlus}>
				<p className="font-medium">Default callout</p>
				<p className="text-sm">
					Tinted in the primary hue — for guidance, tips, and friendly nudges.
				</p>
			</Callout>
			<Callout variant="problem" size="sm" alert Icon={DestructiveOctagon}>
				<p className="font-medium">Problem callout</p>
				<p className="text-sm">
					Carries the danger hue and an alert role — for errors and blocked
					actions.
				</p>
			</Callout>
			<Callout variant="ghost" size="sm" Icon={MessageCircleWarningIcon}>
				<p className="font-medium">Ghost callout</p>
				<p className="text-sm">
					Quiet muted surface — for context the reader can take or leave.
				</p>
			</Callout>
		</div>
	)
}

// Mocked language picker — mirrors SelectOneOfYourLanguages without depending
// on auth/profile state. Two "your languages" up top, the rest below.
const showcaseKnownLangs = ['hin', 'tam'] as const

function ShowcaseLanguagePicker() {
	const [value, setValue] = useState<string>('hin')
	const [open, setOpen] = useState(false)
	const id = useId()

	const otherLanguages = allLanguageOptions.filter(
		(opt) => !showcaseKnownLangs.includes(opt.value as never)
	)

	const onSelect = (next: string) => {
		setValue(next === value ? '' : next)
		setOpen(false)
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild className="w-full">
				<Button
					variant="soft"
					role="combobox"
					aria-controls={id}
					aria-expanded={open}
					className="bg-card/50 text-foreground justify-between font-normal"
				>
					{value
						? (allLanguageOptions.find((l) => l.value === value)?.label ??
							value)
						: 'Select language...'}
					<ChevronsUpDown className="ms-2 size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent id={id} className="p-0">
				<Command>
					<CommandInput placeholder="Search language..." className="my-1" />
					<CommandList>
						<CommandEmpty>No language found.</CommandEmpty>
						<CommandGroup>
							{showcaseKnownLangs.map((lang) => (
								<CommandItem key={lang} value={lang} onSelect={onSelect}>
									<Check
										className={cn(
											'me-2 size-4',
											value === lang ? 'opacity-100' : 'opacity-0'
										)}
									/>
									{allLanguageOptions.find((l) => l.value === lang)?.label} (
									{lang})
								</CommandItem>
							))}
						</CommandGroup>
						<CommandSeparator />
						<CommandGroup>
							{otherLanguages.slice(0, 50).map((language) => (
								<CommandItem
									key={language.value}
									value={language.value}
									onSelect={onSelect}
								>
									<Check
										className={cn(
											'me-2 size-4',
											value === language.value ? 'opacity-100' : 'opacity-0'
										)}
									/>
									{language.label} ({language.value})
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}

// Static friends for the share-picker showcase, sorted newest-first with a
// couple of older entries and one pending invite to exercise every row state.
const showcaseFriend = (
	uid: string,
	username: string,
	minutesAgo: number | null,
	status: 'friends' | 'pending' = 'friends'
): RelationsFullType =>
	({
		uid,
		status,
		most_recent_created_at:
			minutesAgo === null
				? ''
				: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
		profile: { uid, username, avatar_path: '' },
	}) as unknown as RelationsFullType

const SHOWCASE_FRIENDS: Array<RelationsFullType> = [
	showcaseFriend('u-mei', 'meilin.w', 2),
	showcaseFriend('u-diego', 'diego_r', 18),
	showcaseFriend('u-aiyana', 'aiyana_b', 64),
	showcaseFriend('u-hiro', 'hiro.tanaka', 480),
	showcaseFriend('u-sophie', 'sophiel', 60 * 26, 'pending'),
	showcaseFriend('u-kenji', 'kenji.ono', 60 * 24 * 7),
	showcaseFriend('u-marco', 'marco_b', 60 * 24 * 22),
	showcaseFriend('u-garlic', 'GarlicFace', null),
]

function ShowcaseFriendPicker() {
	const [open, setOpen] = useState(false)
	return (
		<div className="bg-card/50 rounded border p-3">
			<Button onClick={() => setOpen(true)} className="gap-2">
				<Send className="size-4" /> Send in chat
			</Button>
			<SelectFriendsToShareDialog
				open={open}
				onOpenChange={setOpen}
				friends={SHOWCASE_FRIENDS}
				title="Send to friends"
				description="Pick one or more friends to send this phrase"
				preview={
					<SharePreviewChip
						title="வணக்கம், எப்படி இருக்கிறீர்கள்?"
						subtitle="Hello, how are you?"
					/>
				}
				onSend={(uids) => {
					setOpen(false)
					toastSuccess(
						`Phrase sent to ${uids.length} friend${uids.length === 1 ? '' : 's'}`
					)
				}}
			/>
		</div>
	)
}

function ShowcaseChoiceTileGroup() {
	const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
	const [font, setFont] = useState<'default' | 'dyslexic'>('default')
	return (
		<div className="space-y-4">
			<div className="space-y-1">
				<p className="text-sm font-medium">Appearance</p>
				<div className="flex gap-2">
					{(
						[
							['light', 'Light', Sun],
							['dark', 'Dark', Moon],
							['system', 'System', MonitorCog],
						] as const
					).map(([value, label, Icon]) => (
						<ChoiceTile
							key={value}
							selected={theme === value}
							onClick={() => setTheme(value)}
							className="flex flex-1 items-center gap-3 px-4 py-3 text-start"
						>
							<Icon className="size-5 shrink-0" />
							<span className="font-medium">{label}</span>
						</ChoiceTile>
					))}
				</div>
			</div>
			<div className="space-y-1">
				<p className="text-sm font-medium">Font style</p>
				<div className="flex gap-2">
					{(
						[
							['default', 'Default', 'Atkinson Hyperlegible'],
							['dyslexic', 'Dyslexic', 'OpenDyslexic'],
						] as const
					).map(([value, label, sub]) => (
						<ChoiceTile
							key={value}
							selected={font === value}
							onClick={() => setFont(value)}
							className="flex flex-1 items-center gap-3 px-4 py-3 text-start"
						>
							<BookA className="size-5 shrink-0" />
							<div>
								<span className="block font-medium">{label}</span>
								<span className="text-muted-foreground text-sm">{sub}</span>
							</div>
						</ChoiceTile>
					))}
				</div>
			</div>
		</div>
	)
}

// Twin of the friend-chat bubble (src/routes/_user/friends/chats.$friendUid.tsx).
// `isMine` flips alignment + drops the avatar, matching the live component.
// Real chat messages always attach a phrase / playlist / request preview,
// so the bubble takes its content via `children` (typically a card preview).
function ChatBubble({
	isMine,
	username,
	initials,
	seed,
	label,
	time,
	children,
}: {
	isMine: boolean
	username: string
	initials: string
	seed: string
	label: string
	time: string
	children: ReactNode
}) {
	return (
		<div
			className={cn(
				'max-w-[80%] items-start gap-2',
				isMine
					? 'align-end ms-auto justify-end ps-[10%]'
					: 'align-start me-auto justify-start pe-[10%]'
			)}
		>
			<div>
				<div className="mb-1 flex items-center gap-2">
					{!isMine && (
						<Avatar className="h-8 w-8 shrink-0">
							<AvatarFallback seed={seed} className="text-xs font-bold">
								{initials}
							</AvatarFallback>
						</Avatar>
					)}
					<p
						className={cn(
							'text-muted-foreground grow text-xs',
							isMine && 'text-end'
						)}
					>
						{isMine ? (
							<>
								{label} &middot; {time}
							</>
						) : (
							<>
								{time} &middot; {label}
							</>
						)}
					</p>
				</div>
				{children}
			</div>
			<span className="sr-only">{isMine ? 'You' : username}</span>
		</div>
	)
}

// Mock of CardPreview — the real component (src/routes/_user/friends/-card-preview.tsx)
// fetches the phrase from the collection; here we pass content in directly.
function ChatPhrasePreview({
	isMine,
	text,
	translation,
	lang,
}: {
	isMine: boolean
	text: string
	translation: string
	lang: string
}) {
	return (
		<CardlikeFlashcard
			className={cn(
				'relative z-10 mb-0',
				isMine ? 'rounded-br-none' : 'rounded-bl-none'
			)}
		>
			<CardContent className="space-y-2 p-4">
				<div className="flex items-center justify-between gap-2">
					<CardTitle className="text-lg">{text}</CardTitle>
					<LangBadge lang={lang} />
				</div>
				<p className="text-muted-foreground">{translation}</p>
			</CardContent>
		</CardlikeFlashcard>
	)
}

function ShowcaseChatBubbles() {
	return (
		<div className="bg-card/50 flex h-110 flex-col rounded border">
			<div className="flex flex-row items-center gap-3 border-b p-3">
				<Avatar>
					<AvatarFallback seed="priya" className="font-bold">
						PL
					</AvatarFallback>
				</Avatar>
				<div className="flex-1">
					<p className="leading-tight font-semibold">Priya L.</p>
					<p className="text-muted-foreground text-xs">Friends</p>
				</div>
			</div>
			<div className="flex-1 overflow-y-auto p-4">
				<div className="space-y-4">
					<ChatBubble
						isMine={false}
						username="Priya L."
						initials="PL"
						seed="priya"
						label="Sent a phrase recommendation"
						time="2m ago"
					>
						<ChatPhrasePreview
							isMine={false}
							text="selamat sonja"
							translation="good evening"
							lang={SHOWCASE_LANG}
						/>
					</ChatBubble>
					<ChatBubble
						isMine
						username="You"
						initials="Yo"
						seed="self"
						label="Added this to your deck"
						time="just now"
					>
						<ChatPhrasePreview
							isMine
							text="selamat sonja"
							translation="good evening"
							lang={SHOWCASE_LANG}
						/>
					</ChatBubble>
				</div>
			</div>
			<div className="border-t p-3">
				<div className="flex items-center gap-2">
					<Input
						placeholder="Send a phrase, playlist, or request..."
						className="cursor-pointer"
						readOnly
					/>
					<Button size="icon" aria-label="Open send menu">
						<Send className="size-4" />
					</Button>
				</div>
			</div>
		</div>
	)
}

// Twin of ProfileWithRelationship + AvatarIconRow. Renders the four states
// (unconnected, pending-from-them, pending-from-me, friends) side by side
// without depending on real profile data or the router.
function ProfilePill({
	username,
	seed,
	children,
}: {
	username: string
	seed: string
	children: ReactNode
}) {
	return (
		<div className="flex w-full flex-row items-center gap-4">
			<div className="hover:bg-1-mlo-primary hover:border-2-mlo-primary flex grow flex-row items-center justify-start gap-4 rounded-2xl border border-transparent p-2">
				<Avatar className="size-8">
					<AvatarFallback seed={seed} className="text-xs font-bold">
						{username.slice(0, 2).toUpperCase()}
					</AvatarFallback>
				</Avatar>
				<span>{username}</span>
			</div>
			<div className="flex flex-row gap-2">{children}</div>
		</div>
	)
}

function ShowcaseProfilePills() {
	return (
		<div className="bg-card/50 space-y-1 rounded border p-3">
			<ProfilePill username="Priya L." seed="priya">
				<Button
					variant="default"
					size="icon"
					className="size-8"
					aria-label="Send friend request"
				>
					<Send className="me-[0.1rem] mt-[0.1rem] size-6" />
				</Button>
			</ProfilePill>
			<ProfilePill username="Marco R." seed="marco">
				<Button
					variant="default"
					size="icon"
					className="size-8"
					aria-label="Accept invitation"
				>
					<ThumbsUp />
				</Button>
				<Button
					variant="neutral"
					size="icon"
					className="size-8"
					aria-label="Decline invitation"
				>
					<X className="size-6 p-0" />
				</Button>
			</ProfilePill>
			<ProfilePill username="Theo K." seed="theo">
				<Button
					variant="neutral"
					size="icon"
					className="size-8"
					aria-label="Cancel friend request"
				>
					<X className="size-6 p-0" />
				</Button>
			</ProfilePill>
			<ProfilePill username="Sofía M." seed="sofia">
				<UserCheck className="size-6 p-0" />
			</ProfilePill>
		</div>
	)
}

function ShowcaseIntroCallout() {
	return (
		<div className="space-y-2">
			<div className="border-3-mlo-primary bg-1-mlo-primary flex items-start gap-2 rounded border px-3 py-2 text-sm">
				<Info className="text-primary mt-0.5 size-4 shrink-0" />
				<div className="flex-1">
					<span className="text-foreground/80">
						Quick reminder: reviews use a 4 am cutoff, so cards due "today" stay
						available until tomorrow morning.
					</span>{' '}
					<button className="text-primary underline hover:no-underline">
						Learn more
					</button>
				</div>
			</div>
			<div className="border-3-mlo-primary bg-1-mlo-primary flex items-start gap-2 rounded border px-3 py-2 text-sm">
				<Info className="text-primary mt-0.5 size-4 shrink-0" />
				<div className="flex-1">
					<span className="text-foreground/80">
						No "show more" link when the callout stands on its own.
					</span>
				</div>
			</div>
		</div>
	)
}

function ShowcaseAvatarSizes() {
	const sizes: Array<{
		cls: string
		label: string
		usage: string
		seed: string
		initials: string
	}> = [
		{
			cls: 'size-6',
			label: '6',
			usage:
				'Inline bylines and the nav-user dropdown trigger — small comment / reply rows.',
			seed: 'priya',
			initials: 'PL',
		},
		{
			cls: 'size-8',
			label: '8',
			usage:
				'Workhorse size: feed bylines, chat message bubbles, profile pills.',
			seed: 'marco',
			initials: 'MR',
		},
		{
			cls: 'size-10',
			label: '10 (default)',
			usage:
				'The bare <Avatar />: request-thread bylines and the chat-header avatar.',
			seed: 'theo',
			initials: 'TK',
		},
		{
			cls: 'size-12',
			label: '12',
			usage: 'Home-page profile button in the top-right.',
			seed: 'sofia',
			initials: 'SM',
		},
	]
	return (
		<dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3">
			{sizes.map((s) => (
				<div
					key={s.label}
					className="col-span-2 grid grid-cols-subgrid items-center"
				>
					<dt className="flex w-16 flex-col items-center gap-1">
						<Avatar className={s.cls}>
							<AvatarFallback seed={s.seed} className="font-bold">
								{s.initials}
							</AvatarFallback>
						</Avatar>
						<span className="text-muted-foreground text-xs">{s.label}</span>
					</dt>
					<dd className="text-muted-foreground text-sm">{s.usage}</dd>
				</div>
			))}
		</dl>
	)
}

function SmolShowcaseBlock({
	label,
	children,
}: {
	label: string
	children: ReactNode
}) {
	return (
		<div className="mb-6 break-inside-avoid space-y-2">
			<h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
				{label}
			</h3>
			{children}
		</div>
	)
}

function SmolShowcase() {
	return (
		<section className="@container space-y-6">
			<div className="space-y-1">
				<h2 className="text-lg font-semibold">Pickers, menus & callouts</h2>
				<p className="text-muted-foreground text-sm">
					Smaller building blocks shown in isolation — dropdowns, tabs, the
					language picker, the send-in-chat friend picker, and the three callout
					variants.
				</p>
			</div>
			<div className="gap-x-6 @2xl:columns-2">
				<SmolShowcaseBlock label="Card status dropdown">
					<ShowcaseCardStatusDropdown />
				</SmolShowcaseBlock>
				<SmolShowcaseBlock label="Tabs list picker">
					<ShowcaseTabsList />
				</SmolShowcaseBlock>
				<SmolShowcaseBlock label="Context menu">
					<div className="flex items-center gap-2">
						<ShowcaseContextMenu />
						<span className="text-muted-foreground text-sm">
							Click for menu items
						</span>
					</div>
				</SmolShowcaseBlock>
				<SmolShowcaseBlock label="Filter dropdown">
					<ShowcaseFilterMenu />
				</SmolShowcaseBlock>
				<SmolShowcaseBlock label="Select one of your languages">
					<div className="max-w-xs">
						<ShowcaseLanguagePicker />
					</div>
				</SmolShowcaseBlock>
				<SmolShowcaseBlock label="Send in chat (friend picker)">
					<ShowcaseFriendPicker />
				</SmolShowcaseBlock>
				<SmolShowcaseBlock label="Callouts">
					<ShowcaseCallouts />
				</SmolShowcaseBlock>
			</div>
		</section>
	)
}

function SocialShowcase() {
	return (
		<section className="@container space-y-6">
			<div className="space-y-1">
				<h2 className="text-lg font-semibold">Profiles, chat & onboarding</h2>
				<p className="text-muted-foreground text-sm">
					Avatar sizes, friend-relationship pills, the chat bubble pair, and the
					inline intro callout — each shown across the states the app uses.
				</p>
			</div>
			<div className="gap-x-6 @2xl:columns-2">
				<SmolShowcaseBlock label="Choice tile group">
					<ShowcaseChoiceTileGroup />
				</SmolShowcaseBlock>
				<SmolShowcaseBlock label="Avatar sizes">
					<ShowcaseAvatarSizes />
				</SmolShowcaseBlock>
				<SmolShowcaseBlock label="Profile pill (relationship states)">
					<ShowcaseProfilePills />
				</SmolShowcaseBlock>
				<SmolShowcaseBlock label="Intro callout">
					<ShowcaseIntroCallout />
				</SmolShowcaseBlock>
				<SmolShowcaseBlock label="Chat bubbles (theirs + yours)">
					<ShowcaseChatBubbles />
				</SmolShowcaseBlock>
			</div>
		</section>
	)
}

function ComponentShowcase() {
	return (
		<section className="@container space-y-6">
			<div className="space-y-1">
				<h2 className="text-lg font-semibold">Components in context</h2>
				<p className="text-muted-foreground text-sm">
					Real UI components assembled with a made-up language ({SHOWCASE_LANG})
					and placeholder content — a request thread, the deck dialog, and a
					card mid-review.
				</p>
			</div>

			<div className="grid gap-6 @3xl:grid-cols-2">
				<div className="space-y-2">
					<h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						Request thread
					</h3>
					<ShowcaseRequestThread />
				</div>
				<div className="space-y-6">
					<div className="space-y-2">
						<h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
							Deck dialog
						</h3>
						<ShowcaseDeckDialog />
					</div>
					<div className="space-y-2">
						<h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
							Card in review
						</h3>
						<ShowcaseReviewCard />
					</div>
					<div className="space-y-2">
						<h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
							Buttons & type
						</h3>
						<ShowcaseButtonsAndType />
					</div>
				</div>
			</div>
		</section>
	)
}

// Our standard brand hue, shown alongside the per-language stops.
const BRAND_HUE = 300

function ThemesPage() {
	const { data: ranked = [] } = useLiveQuery((q) =>
		q
			.from({ language: languagesCollection })
			.where(({ language }) => gt(language.display_order, 0))
			.orderBy(({ language }) => language.display_order)
	)

	const [activeHue, setActiveHue] = useState<number | null>(null)

	// Apply the picked hue to <html> so it reaches the body background
	// (--background is hue-derived) and the whole app chrome — not just
	// this page's subtree. Cleared on reset and when leaving the page.
	useEffect(() => {
		const root = document.documentElement
		const props = ['--hue-primary', '--hue-accent', '--hue-neutral']
		if (activeHue === null) {
			props.forEach((p) => root.style.removeProperty(p))
			return
		}
		props.forEach((p) => root.style.setProperty(p, String(activeHue)))
		return () => props.forEach((p) => root.style.removeProperty(p))
	}, [activeHue])

	const grouped = LANG_HUES.map((hue, i) => ({
		index: i,
		hue,
		langs: allLanguageOptions.filter((opt) => getLangHueIndex(opt.value) === i),
	}))

	// Brand first, then the per-language stops descending from just below
	// the brand hue, wrapping the above-brand stops to the end.
	const langSwatches = LANG_HUES.map((hue, i) => ({
		hue,
		label: `#${i}`,
		brand: false,
	}))
	const swatches = [
		{ hue: BRAND_HUE, label: 'Brand', brand: true },
		...langSwatches
			.filter((s) => s.hue < BRAND_HUE)
			.toSorted((a, b) => b.hue - a.hue),
		...langSwatches
			.filter((s) => s.hue > BRAND_HUE)
			.toSorted((a, b) => b.hue - a.hue),
	]

	// Brand is the default hue, so picking it (or clearing) is not an
	// override — the reset control has nothing to do in that state.
	const isDefaultHue = activeHue === null || activeHue === BRAND_HUE

	return (
		<div className="@container mx-auto max-w-5xl space-y-8 p-6">
			<ComponentShowcase />

			<SmolShowcase />

			<SocialShowcase />

			<header className="space-y-2">
				<h1 className="text-2xl font-bold">Per-language palette</h1>
				<p className="text-muted-foreground text-sm">
					{LANG_HUES.length} hand-picked OKLCH stops, walked over languages in
					popularity order ({'learners × phrases_to_learn'}). Stop walk: 6, 0,
					4, 8, 2, 7, 1, 5, 9, 3 — adjacent ranks always land far apart on the
					wheel.
				</p>
			</header>

			<section className="space-y-2">
				<div className="flex items-center justify-between gap-2">
					<h2 className="text-lg font-semibold">Swatches</h2>
					{/* Always rendered so its show/hide never shifts the layout. */}
					<Button
						size="sm"
						variant="neutral"
						onClick={() => setActiveHue(null)}
						className={cn(isDefaultHue && 'invisible')}
						aria-hidden={isDefaultHue}
						tabIndex={isDefaultHue ? -1 : undefined}
					>
						Reset page hue
					</Button>
				</div>
				<p className="text-muted-foreground text-sm">
					Click any swatch to theme the whole page with that hue.
				</p>
				<div className="grid grid-cols-4 gap-2 @md:grid-cols-6 @3xl:grid-cols-11">
					{swatches.map((s) => {
						const isActive = activeHue === s.hue
						return (
							<button
								key={s.label}
								type="button"
								aria-pressed={isActive}
								aria-label={`Theme the page with ${
									s.brand ? 'the brand' : `stop ${s.label}`
								} hue, ${s.hue} degrees`}
								onClick={() => setActiveHue(isActive ? null : s.hue)}
								className={cn(
									'flex cursor-pointer flex-col items-center gap-1 rounded border p-2 text-xs transition-colors',
									isActive
										? 'border-primary ring-primary ring-2'
										: s.brand
											? 'border-primary'
											: 'hover:border-border border-transparent'
								)}
								style={{ '--hue-primary': s.hue } as CSSProperties}
							>
								<div className="bg-1-mlo-primary h-10 w-full rounded" />
								<span className="flex flex-col items-center text-center leading-tight">
									<span
										className={cn(
											'flex items-center gap-0.5',
											s.brand && 'text-primary-foresoft font-semibold'
										)}
									>
										{s.brand && <Star className="size-3" />}
										{s.brand ? 'Brand' : s.label}
									</span>
									<span className="text-muted-foreground">{s.hue}°</span>
								</span>
							</button>
						)
					})}
				</div>
			</section>

			<details className="rounded border p-4 [&>*+*]:mt-2">
				<summary className="cursor-pointer text-lg font-semibold">
					Popularity walk
				</summary>
				<p className="text-muted-foreground text-sm">
					Languages in popularity order. The stop column should read 6, 0, 4, 8,
					2, 7, 1, 5, 9, 3, 6, 0, 4 …
				</p>
				<div className="grid grid-cols-1 gap-1 @md:grid-cols-2 @lg:grid-cols-3">
					{ranked.map((lang, i) => (
						<div key={lang.lang} className="flex items-center gap-2 text-sm">
							<span className="text-muted-foreground w-6 text-end text-xs tabular-nums">
								{i + 1}
							</span>
							<LangBadge lang={lang.lang} />
							<span className="flex-1 truncate">{lang.name}</span>
							<span className="text-muted-foreground text-xs tabular-nums">
								#{getLangHueIndex(lang.lang)} · {getLangHue(lang.lang)}°
							</span>
						</div>
					))}
				</div>
			</details>

			<details className="rounded border p-4 [&>*+*]:mt-4">
				<summary className="cursor-pointer text-lg font-semibold">
					Languages by stop
				</summary>
				{grouped.map((group) => (
					<div key={group.hue} className="space-y-2">
						<div className="text-muted-foreground text-xs">
							stop #{group.index} · hue {group.hue}° · {group.langs.length}{' '}
							{group.langs.length === 1 ? 'language' : 'languages'}
						</div>
						<div className="flex flex-wrap gap-2">
							{group.langs.map((opt) => {
								const pop = getLangPopularityIndex(opt.value)
								return (
									<div
										key={opt.value}
										className="flex items-center gap-2 text-sm"
									>
										<LangBadge lang={opt.value} />
										<span>{opt.label}</span>
										<span className="text-muted-foreground text-xs tabular-nums">
											#{pop + 1}
										</span>
									</div>
								)
							})}
						</div>
					</div>
				))}
			</details>
		</div>
	)
}
