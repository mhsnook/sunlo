import {
	useState,
	useRef,
	useMemo,
	useCallback,
	useEffect,
	type CSSProperties,
	type RefObject,
	type ReactElement,
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
	DrawerTitle,
	DrawerTrigger,
} from '@/components/ui/drawer'
import { LangBadge } from '@/components/ui/badge'
import languages, { allLanguageOptions } from '@/lib/languages'
import { useProfile } from '@/features/profile/hooks'
import { useDecks } from '@/features/deck/hooks'
import { useIsMobile } from '@/hooks/use-mobile'
import { getLangHue } from '@/lib/lang-theme'
import { cn } from '@/lib/utils'

const POPULAR_LANGS = ['eng', 'spa', 'fra', 'cmn', 'jpn', 'deu']

function langHueStyle(code: string): CSSProperties {
	return { '--hue-primary': getLangHue(code) } as CSSProperties
}

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
			style={langHueStyle(code)}
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
			className="hover:bg-primary/10 focus-visible:bg-primary/10 text-foreground flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors outline-none"
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
	q,
	onPick,
}: {
	exclude: string[]
	isDisabled: (code: string) => boolean
	isSelected: (code: string) => boolean
	q: string
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
						q={q}
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
	primaryLang?: string
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
	primaryLang,
}: PickerBodyProps) {
	const q = search.trim()
	const isFiltering = q.length > 0

	// Focus the search input shortly after mount (popover/drawer open)
	useEffect(() => {
		const id = setTimeout(() => searchRef.current?.focus(), focusDelay)
		return () => clearTimeout(id)
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
		if (!q) return allLanguageOptions
		const needle = q.toLowerCase()
		return allLanguageOptions.filter(
			(l) =>
				l.label.toLowerCase().includes(needle) ||
				l.value.toLowerCase().startsWith(needle)
		)
	}, [q])

	const visibleKnown = knownLangs.filter((c) => !isDisabled(c))
	const visibleDecks = deckLangs.filter(
		(c) => !isDisabled(c) && !knownLangs.includes(c)
	)
	const tileExclude = signedIn
		? [...visibleKnown, ...visibleDecks]
		: POPULAR_LANGS.filter((c) => !isDisabled(c))

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
						<div className="flex flex-col pt-2">
							{filteredAll
								.filter((l) => !isDisabled(l.value))
								.slice(0, 60)
								.map((l) => (
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
				) : signedIn ? (
					<>
						{visibleKnown.length > 0 && (
							<section className="mt-2.5">
								<SectionHead
									label="Your languages"
									count={visibleKnown.length}
								/>
								<div className="grid grid-cols-2 gap-2 px-1">
									{visibleKnown.map((code) => (
										<LangTile
											key={code}
											code={code}
											isPrimary={code === primaryLang}
											isSelected={isSelected(code)}
											onPick={onPick}
										/>
									))}
								</div>
							</section>
						)}
						{visibleDecks.length > 0 && (
							<section className="mt-2.5">
								<SectionHead label="Your decks" count={visibleDecks.length} />
								<div className="grid grid-cols-2 gap-2 px-1">
									{visibleDecks.map((code) => (
										<LangTile
											key={code}
											code={code}
											isSelected={isSelected(code)}
											onPick={onPick}
										/>
									))}
								</div>
							</section>
						)}
						<div className="border-border mx-1 my-3 border-t border-dashed" />
						<section>
							<SectionHead label="All languages" count="A — Z" />
							<AllLanguagesList
								exclude={tileExclude}
								isDisabled={isDisabled}
								isSelected={isSelected}
								q=""
								onPick={onPick}
							/>
						</section>
					</>
				) : (
					<>
						<section className="mt-2.5">
							<SectionHead label="Popular languages" count="most active" />
							<div className="grid grid-cols-2 gap-2 px-1">
								{POPULAR_LANGS.filter((c) => !isDisabled(c)).map((code) => (
									<LangTile
										key={code}
										code={code}
										isSelected={isSelected(code)}
										onPick={onPick}
									/>
								))}
							</div>
						</section>
						<div className="border-border mx-1 my-3 border-t border-dashed" />
						<section>
							<SectionHead label="All languages" count="A — Z" />
							<AllLanguagesList
								exclude={tileExclude}
								isDisabled={isDisabled}
								isSelected={isSelected}
								q=""
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
			className={cn(
				'flex w-full items-center gap-2.5 rounded-2xl border bg-card px-3.5 py-2.5 text-left text-sm font-sans',
				'cursor-pointer transition-all hover:border-primary/50',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
				hasError ? 'border-destructive' : 'border-border',
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
	children,
}: {
	value: string
	setValue: (v: string) => void
	disabled?: string[]
	/** Only used when children is a string — passed to the built-in trigger */
	hasError?: boolean
	/** Only used when children is a string — passed to the built-in trigger */
	className?: string
	children?: string | ReactElement
}) {
	const [open, setOpen] = useState(false)
	const [search, setSearch] = useState('')
	const searchRef = useRef<HTMLInputElement | null>(null)
	const isMobile = useIsMobile()

	const { data: profile } = useProfile()
	const { data: decks } = useDecks()

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
	const signedIn = !!profile

	const pick = useCallback(
		(code: string) => {
			setValue(code)
			setOpen(false)
			setSearch('')
		},
		[setValue]
	)

	const handleOpenChange = useCallback((next: boolean) => {
		setOpen(next)
		if (!next) setSearch('')
	}, [])

	const trigger =
		typeof children !== 'object' ? (
			<LanguagePickerTrigger
				value={value}
				placeholder={
					typeof children === 'string' ? children : 'Select language…'
				}
				hasError={hasError}
				className={className}
			/>
		) : (
			children
		)

	const bodyProps: PickerBodyProps = {
		search,
		setSearch,
		onPick: pick,
		currentValue: value,
		disabled,
		searchRef,
		signedIn,
		knownLangs,
		deckLangs,
		primaryLang,
	}

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={handleOpenChange}>
				<DrawerTrigger asChild>{trigger}</DrawerTrigger>
				<DrawerContent className="flex max-h-[90svh] flex-col">
					<div className="border-border flex shrink-0 items-center justify-between border-b px-4 pb-3">
						<DrawerTitle>Pick a language</DrawerTitle>
						<DrawerClose
							className="bg-muted text-foreground hover:bg-muted/80 flex size-8 items-center justify-center rounded-xl"
							aria-label="Close"
						>
							<X className="size-4" />
						</DrawerClose>
					</div>
					<PickerBody {...bodyProps} focusDelay={280} />
				</DrawerContent>
			</Drawer>
		)
	}

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>{trigger}</PopoverTrigger>
			<PopoverContent
				className="flex flex-col overflow-hidden rounded-xl p-0"
				style={
					{ width: 'min(420px, 92vw)', maxHeight: '540px' } as CSSProperties
				}
				align="start"
				sideOffset={6}
			>
				<PickerBody {...bodyProps} />
			</PopoverContent>
		</Popover>
	)
}
