import {
	Check,
	ListMusic,
	MessageCircleQuestion,
	Plus,
	type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toastError } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { addPhrasesToDeck } from '@/features/deck/mutations'
import languages from '@/lib/languages'
import { cn } from '@/lib/utils'
import type { CoachView } from '../conversation'
import {
	usePhrasesByIds,
	usePlaylistsByIds,
	useRequestsByIds,
	type DeckMeter as DeckMeterData,
} from '../hooks'
import { playlistPhraseIds, translationFor, type DeckStatus } from '../library'
import { DECK_TARGET } from '../protocol'
import { addNote, openLocalView, showView, usePageState } from '../store'

type Props = {
	coachKey: string
	coachViews: Array<CoachView>
	lang: string
	uid: string
	translationLang: string
	deck: DeckMeterData
}

export function CoachCanvas(props: Props) {
	const page = usePageState(props.coachKey)
	const views = [...props.coachViews, ...page.localViews]
	const view =
		views.find((v) => v.id === page.activeViewId) ??
		props.coachViews.at(-1) ??
		page.localViews.at(-1) ??
		null

	return (
		<div className="flex flex-col gap-6" data-testid="coach-canvas">
			<header className="flex flex-col-reverse items-start justify-between gap-4 @2xl:flex-row">
				<div className="flex flex-col gap-1">
					<h1
						className="text-3xl font-bold tracking-tight @2xl:text-4xl"
						data-testid="coach-view-title"
					>
						{view?.title ?? `Your ${languages[props.lang] ?? props.lang} coach`}
					</h1>
					<p className="text-muted-foreground">
						{view?.subtitle ??
							(view
								? `Chosen by your coach from the ${languages[props.lang]} library`
								: 'Tell your coach why you are learning. Phrases they find for you show up here.')}
					</p>
				</div>
				<DeckMeter lang={props.lang} deck={props.deck} />
			</header>

			{views.length > 1 && (
				<nav className="flex flex-wrap gap-2" aria-label="Earlier sets">
					{views.map((v) => (
						<Button
							key={v.id}
							size="sm"
							variant={v.id === view?.id ? 'soft' : 'ghost'}
							data-testid="coach-view-tab"
							data-key={v.id}
							onClick={() => showView(props.coachKey, v.id)}
						>
							{v.title}
						</Button>
					))}
				</nav>
			)}

			{view ? <ViewContent key={view.id} view={view} {...props} /> : null}
		</div>
	)
}

function DeckMeter({ lang, deck }: { lang: string; deck: DeckMeterData }) {
	const { size, tags } = deck
	const percent = Math.min(100, Math.round((size / DECK_TARGET) * 100))
	return (
		<div
			className="bg-card w-full shrink-0 rounded border p-4 shadow-sm @2xl:w-64"
			data-testid="coach-deck-meter"
			data-size={size}
		>
			<p className="text-muted-foreground text-sm">
				Your {languages[lang] ?? lang} deck
			</p>
			<p className="text-2xl font-bold">
				{size}
				<span className="text-muted-foreground text-base font-normal">
					{' '}
					/ {DECK_TARGET}
				</span>
			</p>
			<div className="bg-primary-100 mt-2 h-2 overflow-hidden rounded-full">
				<div
					className="bg-primary-600 h-full rounded-full transition-all"
					style={{ width: `${percent}%` }}
				/>
			</div>
			{tags.length > 0 && (
				<ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
					{tags.map((tag) => (
						<li key={tag.name} className="flex items-center gap-1">
							<TagDot name={tag.name} />
							{tag.count} {tag.name}
						</li>
					))}
				</ul>
			)}
		</div>
	)
}

// Stock colours, so a tag keeps its colour in both modes.
const TAG_DOTS = [
	'bg-amber-500',
	'bg-rose-500',
	'bg-teal-500',
	'bg-sky-500',
	'bg-violet-500',
	'bg-lime-500',
]

function TagDot({ name }: { name: string }) {
	let hash = 0
	for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
	return (
		<span
			aria-hidden
			className={cn(
				'size-2 shrink-0 rounded-full',
				TAG_DOTS[hash % TAG_DOTS.length]
			)}
		/>
	)
}

function ViewContent({
	view,
	coachKey,
	lang,
	uid,
	translationLang,
	deck,
}: Props & { view: CoachView }) {
	const phrases = usePhrasesByIds(view.phraseIds)
	const requests = useRequestsByIds(view.requestIds)
	const playlists = usePlaylistsByIds(view.playlistIds)

	const openSet = (title: string, phraseIds: Array<string>, note: string) =>
		openLocalView(
			coachKey,
			{
				id: crypto.randomUUID(),
				title,
				subtitle: null,
				phraseIds,
				requestIds: [],
				playlistIds: [],
			},
			note
		)

	const phraseGrid = (
		<ul
			className="grid grid-cols-1 gap-3 @2xl:grid-cols-2"
			data-testid="coach-phrases"
		>
			{phrases.map((phrase) => (
				<PhraseTile
					key={phrase.id}
					text={phrase.text}
					translation={translationFor(phrase, translationLang)}
					tag={phrase.tags[0]?.name ?? null}
					status={deck.statuses.get(phrase.id) ?? null}
					phraseId={phrase.id}
					onAdd={() => {
						addPhrasesToDeck(lang, uid, [
							{ id: phrase.id, only_reverse: phrase.only_reverse },
						]).then(
							() => addNote(coachKey, `added “${phrase.text}”`),
							(err: unknown) => {
								console.error('coach: add failed', err)
								toastError(`Couldn't add “${phrase.text}”`)
							}
						)
					}}
				/>
			))}
		</ul>
	)

	if (!requests.length && !playlists.length) return phraseGrid

	return (
		<Tabs
			defaultValue={
				phrases.length ? 'phrases' : requests.length ? 'requests' : 'sets'
			}
		>
			<TabsList>
				<TabsTrigger value="phrases">Phrases · {phrases.length}</TabsTrigger>
				{requests.length > 0 && (
					<TabsTrigger value="requests">
						Requests · {requests.length}
					</TabsTrigger>
				)}
				{playlists.length > 0 && (
					<TabsTrigger value="sets">Sets · {playlists.length}</TabsTrigger>
				)}
			</TabsList>
			<TabsContent value="phrases" className="mt-4">
				{phraseGrid}
			</TabsContent>
			<TabsContent value="requests" className="mt-4">
				<ul className="flex flex-col gap-2">
					{requests.map((request) => (
						<SetButton
							key={request.id}
							id={request.id}
							testId="coach-request"
							icon={MessageCircleQuestion}
							title={request.prompt}
							detail={`${request.answerIds.length} answer${request.answerIds.length === 1 ? '' : 's'}`}
							onOpen={() =>
								openSet(
									request.prompt,
									request.answerIds,
									`opened the request “${request.prompt}”`
								)
							}
						/>
					))}
				</ul>
			</TabsContent>
			<TabsContent value="sets" className="mt-4">
				<ul className="flex flex-col gap-2">
					{playlists.map((playlist) => (
						<SetButton
							key={playlist.id}
							id={playlist.id}
							testId="coach-playlist"
							icon={ListMusic}
							title={playlist.title}
							detail={playlist.description}
							onOpen={() =>
								openSet(
									playlist.title,
									playlistPhraseIds(playlist.id),
									`opened the set “${playlist.title}”`
								)
							}
						/>
					))}
				</ul>
			</TabsContent>
		</Tabs>
	)
}

function PhraseTile({
	text,
	translation,
	tag,
	status,
	phraseId,
	onAdd,
}: {
	text: string
	translation: string | null
	tag: string | null
	status: DeckStatus
	phraseId: string
	onAdd: () => void
}) {
	const inDeck = status === 'active'
	return (
		<li
			data-testid="coach-phrase"
			data-key={phraseId}
			data-in-deck={inDeck}
			className={cn(
				'flex items-center gap-3 rounded border p-4',
				inDeck ? 'border-primary-300 bg-primary-50' : 'bg-card'
			)}
		>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				{tag && (
					<span className="text-muted-foreground flex items-center gap-1.5 text-xs">
						<TagDot name={tag} />
						{tag}
					</span>
				)}
				<span className="text-lg font-semibold">{text}</span>
				{translation && (
					<span className="text-muted-foreground text-sm">{translation}</span>
				)}
			</div>
			{inDeck ? (
				<span className="text-primary-700 flex items-center gap-1 text-sm font-medium">
					<Check className="size-4" /> In deck
				</span>
			) : (
				<Button
					variant="soft"
					size="sm"
					data-testid="coach-add-phrase"
					onClick={onAdd}
				>
					<Plus /> Add
				</Button>
			)}
		</li>
	)
}

function SetButton({
	id,
	testId,
	icon: Icon,
	title,
	detail,
	onOpen,
}: {
	id: string
	testId: string
	icon: LucideIcon
	title: string
	detail: string | null
	onOpen: () => void
}) {
	return (
		<li data-key={id}>
			<button
				type="button"
				data-testid={testId}
				className="hover:border-primary-400 bg-card flex w-full items-center gap-3 rounded-2xl border p-4 text-start"
				onClick={onOpen}
			>
				<Icon className="text-primary-600 size-5 shrink-0" />
				<span className="flex-1 font-medium">{title}</span>
				{detail && (
					<span className="text-muted-foreground line-clamp-2 max-w-1/2 text-sm">
						{detail}
					</span>
				)}
			</button>
		</li>
	)
}
