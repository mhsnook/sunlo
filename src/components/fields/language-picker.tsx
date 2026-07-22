import {
	useState,
	useRef,
	useMemo,
	useCallback,
	useEffect,
	type CSSProperties,
	type RefObject,
	type ReactElement,
	type ReactNode,
	type ButtonHTMLAttributes,
} from 'react'
import { Globe, Search, X, Star, Check, ChevronsUpDown } from 'lucide-react'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerTitle,
	DrawerTrigger,
} from '@/components/ui/drawer'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LangBadge } from '@/components/ui/badge'
import languages, { allLanguageOptions } from '@/lib/languages'
import { useProfile } from '@/features/profile/hooks'
import { useDecks } from '@/features/deck/hooks'
import { useTopLanguages } from '@/features/languages'
import { useIsMobile } from '@/hooks/use-mobile'
import { getLangThemeCss } from '@/lib/lang-theme'
import { cn } from '@/lib/utils'

// How many popular shortcut tiles to display
const POPULAR_LANG_COUNT = 6
// Fetch headroom so that, after excluding disabled langs (e.g. the user's
// existing decks in "discover" mode), the popular list still yields 6 tiles.
const POPULAR_LANG_FETCH = 16

// Shown before the languages collection has synced, so the "Popular languages"
// section never flashes empty. Replaced by live `display_order` ranking once ready.
const FALLBACK_POPULAR_LANGS = ['eng', 'fra', 'hin', 'kan', 'spa', 'tam']

function Highlight({ text, q }: { text: string; q: string }) {
	if (!q) return <>{text}</>
	const i = text.toLowerCase().indexOf(q.toLowerCase())
	if (i < 0) return <>{text}</>
	return (
		<>
			{text.slice(0, i)}
			<mark className="rounded-sm bg-amber-100 px-px text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
				{text.slice(i, i + q.length)}
			</mark>
			{text.slice(i + q.length)}
		</>
	)
}

function SectionHead({
	label,
	count,
}: {
	label: string
	count: string | number
}) {
	return (
		<div className="text-muted-foreground flex items-center gap-2 px-1 py-2 font-mono text-[10.5px] font-bold tracking-widest uppercase">
			<span>{label}</span>
			<span className="ml-auto font-normal tracking-wide">{count}</span>
		</div>
	)
}

function LangTile({
	code,
	isPrimary,
	isSelected,
	onPick,
}: {
	code: string
	isPrimary?: boolean
	isSelected?: boolean
	onPick: (code: string) => void
}) {
	const name = languages[code as keyof typeof languages] ?? code
	return (
		<button
			type="button"
			className="bg-card border-border hover:border-primary/40 flex min-w-0 cursor-pointer flex-col gap-2 rounded-xl border p-2.5 text-left transition-all hover:-translate-y-px hover:shadow-sm"
			style={getLangThemeCss(code)}
			onClick={() => onPick(code)}
		>
			<div className="flex items-center justify-between gap-2">
				<LangBadge lang={code} className="text-[10px]" />
				{isPrimary ? (
					<Star className="size-3.5 shrink-0 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
				) : isSelected ? (
					<Check className="text-primary size-3.5 shrink-0" />
				) : null}
			</div>
			<div className="truncate text-sm leading-tight font-bold tracking-tight">
				{name}
			</div>
		</button>
	)
}

function LangRow({
	code,
	label,
	q,
	isSelected,
	onPick,
}: {
	code: string
	label: string
	q: string
	isSelected?: boolean
	onPick: (code: string) => void
}) {
	return (
		<button
			type="button"
			data-key={code}
			className="hover:bg-lc-1 hover:bg-chroma-lo hover:bg-hue-primary focus-visible:bg-lc-1 focus-visible:bg-chroma-lo focus-visible:bg-hue-primary text-foreground flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors outline-none"
			onClick={() => onPick(code)}
		>
			<span className="min-w-0 flex-1 truncate text-sm font-semibold">
				<Highlight text={label} q={q} />
			</span>
			<LangBadge lang={code} className="shrink-0 text-[10px]" />
			{isSelected && <Check className="text-primary size-3.5 shrink-0" />}
		</button>
	)
}

function AllLanguagesList({
	exclude,
	isDisabled,
	isSelected,
	onPick,
}: {
	exclude: string[]
	isDisabled: (code: string) => boolean
	isSelected: (code: string) => boolean
	onPick: (code: string) => void
}) {
	return (
		<div className="flex flex-col">
			{allLanguageOptions
				.filter((l) => !isDisabled(l.value) && !exclude.includes(l.value))
				.map((l) => (
					<LangRow
						key={l.value}
						code={l.value}
						label={l.label}
						q=""
						isSelected={isSelected(l.value)}
						onPick={onPick}
					/>
				))}
		</div>
	)
}

interface PickerBodyProps {
	search: string
	setSearch: (v: string) => void
	onPick: (code: string) => void
	currentValue: string
	disabled?: string[]
	searchRef: RefObject<HTMLInputElement | null>
	focusDelay?: number
	signedIn: boolean
	knownLangs: string[]
	deckLangs: string[]
	popularLangs: string[]
	primaryLang?: string
	/** Show only "Popular languages" tiles (e.g. add-deck), even when signed in */
	discover?: boolean
}

function PickerBody({
	search,
	setSearch,
	onPick,
	currentValue,
	disabled,
	searchRef,
	focusDelay = 60,
	signedIn,
	knownLangs,
	deckLangs,
	popularLangs,
	primaryLang,
	discover,
}: PickerBodyProps) {
	const q = search.trim()
	const isFiltering = q.length > 0

	// Focus the search input shortly after mount (popover/drawer open)
	useEffect(() => {
		const id = setTimeout(() => searchRef.current?.focus(), focusDelay)
		return () => clearTimeout(id)
		// run once on mount (popover/drawer open) — focusDelay is fixed per instance
		// oxlint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const isDisabled = useCallback(
		(code: string) => disabled?.includes(code) ?? false,
		[disabled]
	)
	const isSelected = useCallback(
		(code: string) => code === currentValue,
		[currentValue]
	)

	const filteredAll = useMemo(() => {
		if (!q) return []
		const needle = q.toLowerCase()
		return allLanguageOptions
			.filter(
				(l) =>
					!isDisabled(l.value) &&
					(l.label.toLowerCase().includes(needle) ||
						l.value.toLowerCase().startsWith(needle))
			)
			.slice(0, 60)
	}, [q, isDisabled])

	const visibleKnown = knownLangs.filter((c) => !isDisabled(c))
	const visibleDecks = deckLangs.filter(
		(c) => !isDisabled(c) && !knownLangs.includes(c)
	)
	// Tile sections shown when not searching. Signed-in users normally see their
	// own languages + decks. "Discover" mode (and signed-out users) instead see a
	// popular-languages shortcut — ranked langs with disabled ones (e.g. existing
	// decks) excluded first, then capped to POPULAR_LANG_COUNT.
	const showPopularOnly = discover || !signedIn
	const tileSections = showPopularOnly
		? [
				{
					label: 'Popular languages',
					count: 'most active' as string | number,
					codes: popularLangs
						.filter((c) => !isDisabled(c))
						.slice(0, POPULAR_LANG_COUNT),
					showPrimary: false,
				},
			]
		: [
				{
					label: 'Your languages',
					count: visibleKnown.length,
					codes: visibleKnown,
					showPrimary: true,
				},
				{
					label: 'Your decks',
					count: visibleDecks.length,
					codes: visibleDecks,
					showPrimary: false,
				},
			].filter((s) => s.codes.length > 0)
	const tileExclude = tileSections.flatMap((s) => s.codes)

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			{/* Search — pinned at top */}
			<div className="bg-popover border-border shrink-0 border-b px-3.5 pt-3 pb-2.5">
				<div className="bg-muted/60 border-border focus-within:border-ring focus-within:ring-ring/20 focus-within:bg-card flex items-center gap-2 rounded-2xl border px-3 py-2 transition-all focus-within:ring-2">
					<Search className="text-muted-foreground size-4 shrink-0" />
					<input
						ref={searchRef}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search 100+ languages…"
						aria-label="Search language"
						data-testid="language-search-input"
						className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
					/>
					{q ? (
						<button
							type="button"
							className="text-muted-foreground hover:text-foreground p-0.5"
							onClick={() => setSearch('')}
							aria-label="Clear"
						>
							<X className="size-3.5" />
						</button>
					) : null}
				</div>
			</div>

			{/* Scrollable results */}
			<div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-4">
				{isFiltering ? (
					filteredAll.length === 0 ? (
						<div className="text-muted-foreground px-4 py-8 text-center text-sm">
							<div>
								No matches for{' '}
								<span className="text-foreground font-bold">"{q}"</span>
							</div>
							<div className="mt-1.5 text-xs">
								Try the ISO 639-3 code, like{' '}
								<code className="bg-muted rounded px-1 py-0.5 font-mono">
									fra
								</code>{' '}
								or{' '}
								<code className="bg-muted rounded px-1 py-0.5 font-mono">
									tam
								</code>
								.
							</div>
						</div>
					) : (
						<div className="flex flex-col pt-2" data-testid="language-options">
							{filteredAll.map((l) => (
								<LangRow
									key={l.value}
									code={l.value}
									label={l.label}
									q={q}
									isSelected={isSelected(l.value)}
									onPick={onPick}
								/>
							))}
						</div>
					)
				) : (
					<>
						{tileSections.map((s) => (
							<section key={s.label} className="mt-2.5">
								<SectionHead label={s.label} count={s.count} />
								<div className="grid grid-cols-2 gap-2 px-1">
									{s.codes.map((code) => (
										<LangTile
											key={code}
											code={code}
											isPrimary={s.showPrimary && code === primaryLang}
											isSelected={isSelected(code)}
											onPick={onPick}
										/>
									))}
								</div>
							</section>
						))}
						<div className="border-border mx-1 my-3 border-t border-dashed" />
						<section>
							<SectionHead label="All languages" count="A — Z" />
							<AllLanguagesList
								exclude={tileExclude}
								isDisabled={isDisabled}
								isSelected={isSelected}
								onPick={onPick}
							/>
						</section>
					</>
				)}
			</div>
		</div>
	)
}

export function LanguagePickerTrigger({
	value,
	hasError,
	className,
	placeholder = 'Select language…',
	...props
}: {
	value: string
	hasError?: boolean
	className?: string
	placeholder?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>) {
	const name = value
		? (languages[value as keyof typeof languages] ?? value)
		: null
	return (
		<button
			type="button"
			data-testid="language-selector-button"
			className={cn(
				// Match the at-rest + hover border treatment of <Input>/<Textarea>
				'flex w-full items-center gap-2.5 rounded-2xl border bg-card/50 px-3.5 py-2.5 text-left text-sm font-sans inset-shadow-sm',
				'ring-offset-background cursor-pointer hover:border-primary',
				'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden',
				hasError
					? 'border-destructive'
					: 'border-lc-3 border-chroma-mlo border-hue-primary',
				!value && 'text-muted-foreground',
				className
			)}
			{...props}
		>
			{value ? (
				<>
					<LangBadge lang={value} />
					<span className="text-foreground font-semibold">{name}</span>
				</>
			) : (
				<>
					<Globe className="text-muted-foreground size-4" />
					<span>{placeholder}</span>
				</>
			)}
			<ChevronsUpDown className="text-muted-foreground ml-auto size-4 shrink-0" />
		</button>
	)
}

export function LanguagePicker({
	value,
	setValue,
	disabled,
	hasError,
	className,
	placeholder,
	discover,
	onConfirm,
	confirmLabel,
	title = 'Pick a language',
	children,
}: {
	value: string
	/** Commits the selection immediately. Optional in confirmation mode, where the choice is committed via `onConfirm` instead. */
	setValue?: (v: string) => void
	disabled?: string[]
	/** Passed to the built-in trigger (ignored when a custom `children` trigger is supplied) */
	hasError?: boolean
	/** Passed to the built-in trigger (ignored when a custom `children` trigger is supplied) */
	className?: string
	/** Placeholder shown by the built-in trigger when no value is set */
	placeholder?: string
	/** Show "Popular languages" tiles instead of the user's own languages/decks (e.g. add-deck) */
	discover?: boolean
	/**
	 * Enables select-with-confirmation. Picking a language stages it (highlighted)
	 * rather than committing immediately; a footer button confirms the choice and
	 * calls this. On desktop the picker renders as a centered modal instead of an
	 * anchored popover.
	 */
	onConfirm?: (lang: string) => void
	/** Footer button content in confirmation mode (receives the staged language) */
	confirmLabel?: (lang: string) => ReactNode
	/** Heading shown in the drawer / modal chrome */
	title?: string
	/** Supply a fully custom trigger element instead of the built-in one */
	children?: ReactElement
}) {
	const [open, setOpen] = useState(false)
	const [search, setSearch] = useState('')
	// In confirmation mode the choice is staged here until the footer confirms it.
	const [pending, setPending] = useState(value)
	const searchRef = useRef<HTMLInputElement | null>(null)
	const isMobile = useIsMobile()
	const confirmMode = !!onConfirm

	const { data: profile } = useProfile()
	const { data: decks } = useDecks()
	const { data: topLanguages } = useTopLanguages(POPULAR_LANG_FETCH)

	const knownLangs = useMemo(
		() => profile?.languages_known?.map((l) => l.lang) ?? [],
		[profile]
	)
	const primaryLang = knownLangs[0]
	const deckLangs = useMemo(
		() => [
			...new Set(decks?.filter((d) => !d.archived).map((d) => d.lang) ?? []),
		],
		[decks]
	)
	const popularLangs = useMemo(
		() =>
			topLanguages?.length
				? topLanguages.map((l) => l.lang)
				: FALLBACK_POPULAR_LANGS,
		[topLanguages]
	)
	const signedIn = !!profile

	const pick = useCallback(
		(code: string) => {
			if (confirmMode) {
				// Stage the choice; the footer button commits it.
				setPending(code)
				return
			}
			setValue?.(code)
			setOpen(false)
			setSearch('')
		},
		[confirmMode, setValue]
	)

	const handleConfirm = useCallback(() => {
		if (!pending) return
		onConfirm?.(pending)
		setOpen(false)
		setSearch('')
	}, [onConfirm, pending])

	const handleOpenChange = useCallback(
		(next: boolean) => {
			setOpen(next)
			if (!next) {
				setSearch('')
				// Drop any staged-but-unconfirmed choice when the picker closes.
				setPending(value)
			}
		},
		[value]
	)

	const trigger = children ?? (
		<LanguagePickerTrigger
			value={value}
			placeholder={placeholder}
			hasError={hasError}
			className={className}
		/>
	)

	const bodyProps: PickerBodyProps = {
		search,
		setSearch,
		onPick: pick,
		currentValue: confirmMode ? pending : value,
		disabled,
		searchRef,
		signedIn,
		knownLangs,
		deckLangs,
		popularLangs,
		primaryLang,
		discover,
	}

	const footer = confirmMode ? (
		<div className="border-border bg-popover shrink-0 border-t p-3.5">
			<Button
				className="w-full"
				size="lg"
				disabled={!pending}
				onClick={handleConfirm}
				data-testid="confirm-language-button"
			>
				{pending ? (confirmLabel?.(pending) ?? 'Confirm') : 'Select a language'}
			</Button>
		</div>
	) : null

	const description = 'Search and choose a language'

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={handleOpenChange}>
				<DrawerTrigger asChild>{trigger}</DrawerTrigger>
				{/* bg-popover (pure white) to match the desktop popover chrome —
				    the shared DrawerContent default bg-background is hue-tinted */}
				<DrawerContent className="bg-popover flex max-h-[90svh] flex-col">
					<div className="border-border flex shrink-0 items-center justify-between border-b px-4 pb-3">
						<DrawerTitle>{title}</DrawerTitle>
						<DrawerClose
							className="bg-muted text-foreground hover:bg-muted/80 flex size-8 items-center justify-center rounded-xl"
							aria-label="Close"
						>
							<X className="size-4" />
						</DrawerClose>
					</div>
					<DrawerDescription className="sr-only">
						{description}
					</DrawerDescription>
					<PickerBody {...bodyProps} focusDelay={280} />
					{footer}
				</DrawerContent>
			</Drawer>
		)
	}

	if (confirmMode) {
		return (
			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogTrigger asChild>{trigger}</DialogTrigger>
				<DialogContent className="bg-popover flex max-h-[85vh] w-full max-w-md flex-col gap-0 overflow-hidden rounded-xl p-0">
					<DialogHeader className="border-border shrink-0 border-b px-4 py-3 pr-12">
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription className="sr-only">
							{description}
						</DialogDescription>
					</DialogHeader>
					<PickerBody {...bodyProps} />
					{footer}
				</DialogContent>
			</Dialog>
		)
	}

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>{trigger}</PopoverTrigger>
			<PopoverContent
				className="flex flex-col overflow-hidden rounded-xl p-0"
				style={
					{
						width: 'min(420px, 92vw)',
						// Cap to the space the positioner reports so the popup always
						// fits its chosen side and scrolls internally — otherwise an
						// over-tall popup overflows and gets shoved into a corner.
						maxHeight: 'min(540px, var(--available-height))',
					} as CSSProperties
				}
				align="start"
				sideOffset={6}
				// Allow flipping above the anchor, but never shift sideways or fall
				// back to the perpendicular axis (which parks it at the screen edge).
				collisionAvoidance={{
					side: 'flip',
					align: 'none',
					fallbackAxisSide: 'none',
				}}
			>
				<PickerBody {...bodyProps} />
			</PopoverContent>
		</Popover>
	)
}
