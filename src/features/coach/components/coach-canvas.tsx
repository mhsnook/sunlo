import { useState } from 'react'
import {
	Check,
	ListMusic,
	MessageCircleQuestion,
	Plus,
	type LucideIcon,
} from 'lucide-react'
import { RequestForm } from '@/components/requests/request-form'
import { Button } from '@/components/ui/button'
import { toastError } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/use-auth'
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
import { dealIntoDeck } from '../deal'
import { openLocalView, showView, usePageState } from '../store'
import { DeckStack } from './deck-stack'
import { TagDot } from './tag-dot'

type Props = {
	coachKey: string
	coachViews: Array<CoachView>
	lang: string
	uid: string | null
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
		<div
			className="flex flex-col gap-6 @2xl:flex-row-reverse @2xl:items-start"
			data-testid="coach-canvas"
		>
			<DeckStack lang={props.lang} uid={props.uid} deck={props.deck} />
			<div className="flex min-w-0 flex-1 flex-col gap-6">
				<header className="flex flex-col gap-1">
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

				{view && props.uid ? (
					<ViewContent key={view.id} {...props} view={view} uid={props.uid} />
				) : null}
			</div>
		</div>
	)
}

function ViewContent({
	view,
	coachKey,
	lang,
	uid,
	translationLang,
	deck,
}: Props & { view: CoachView; uid: string }) {
	const { isAnonymous } = useAuth()
	const phrases = usePhrasesByIds(view.phraseIds)
	const requests = useRequestsByIds(view.requestIds)
	const playlists = usePlaylistsByIds(view.playlistIds)

	const openSet = (
		title: string,
		ids: { phraseIds?: Array<string>; requestIds?: Array<string> },
		note: string
	) =>
		openLocalView(
			coachKey,
			{
				id: crypto.randomUUID(),
				lang,
				title,
				subtitle: null,
				phraseIds: ids.phraseIds ?? [],
				requestIds: ids.requestIds ?? [],
				playlistIds: [],
				draftRequest: null,
			},
			note
		)

	if (view.draftRequest !== null)
		return (
			<div
				className="bg-card max-w-xl rounded border p-4"
				data-testid="coach-request-draft"
			>
				{/* RLS refuses a request from an anonymous user. */}
				{isAnonymous ? (
					<div data-testid="coach-request-needs-account">
						<p className="text-muted-foreground text-sm">
							Posting a request needs an account. Here is your draft:
						</p>
						<p className="mt-2 font-medium">{view.draftRequest}</p>
					</div>
				) : (
					<RequestForm
						lang={lang}
						initialPrompt={view.draftRequest}
						formTestId="coach-request-form"
						onSuccess={(request) =>
							openSet(
								'Your request',
								{ requestIds: [request.id] },
								`posted the request “${request.prompt}”`
							)
						}
					/>
				)}
			</div>
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
					onAdd={() =>
						dealIntoDeck(coachKey, lang, uid, [phrase]).catch(
							(err: unknown) => {
								console.error('coach: add failed', err)
								toastError(`Couldn't add “${phrase.text}”`)
							}
						)
					}
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
									{ phraseIds: request.answerIds },
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
									{ phraseIds: playlistPhraseIds(playlist.id) },
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
	onAdd: () => Promise<void>
}) {
	// addPhrasesToDeck leaves a learned card as it is, so Add would do nothing.
	const inDeck = status === 'active' || status === 'learned'
	const [adding, setAdding] = useState(false)
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
					<Check className="size-4" />{' '}
					{status === 'learned' ? 'Learned' : 'In deck'}
				</span>
			) : (
				<Button
					variant="soft"
					size="sm"
					data-testid="coach-add-phrase"
					disabled={adding}
					onClick={() => {
						setAdding(true)
						void onAdd().finally(() => setAdding(false))
					}}
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
