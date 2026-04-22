import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
	Archive,
	ChevronsRight,
	Compass,
	HeartPlus,
	LogIn,
	Plus,
	UserPlus,
} from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { GarlicBroccoli } from '@/components/garlic'
import { useDecks } from '@/features/deck/hooks'
import { useProfile } from '@/features/profile/hooks'
import { useAuth } from '@/lib/use-auth'
import { decksCollection } from '@/features/deck/collections'
import type { DeckMetaType } from '@/features/deck/schemas'
import languages from '@/lib/languages'

import { DeckTile, AddDeckTile } from './-deck-tile'
import { ReviewBanner } from './-review-banner'
import { CommunityFeedSnippet } from './-community-feed'
import {
	compareDecks,
	DeckDueProbe,
	useDueMap,
	useRecencyWeightedScores,
} from './-deck-ranking'

export const Route = createFileRoute('/_user/learn/')({
	component: Page,
	loader: async ({ context }) => {
		if (context.auth.isAuth) {
			await decksCollection.preload()
		}
	},
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function Page() {
	const { isAuth } = useAuth()
	const { data: decks } = useDecks()
	const activeDecks = decks?.filter((d) => !d.archived) ?? []

	if (!isAuth) {
		return (
			<main
				className="w-full space-y-6"
				style={style}
				data-testid="logged-out-learn-page"
			>
				<div className="px-4 @lg:px-6 @xl:px-8">
					<BrowsePrompt />
				</div>
			</main>
		)
	}

	if (decks && decks.length === 0) {
		return (
			<main
				className="w-full space-y-6"
				style={style}
				data-testid="learn-page-empty"
			>
				<div className="px-4 @lg:px-6 @xl:px-8">
					<NoDecks />
				</div>
			</main>
		)
	}

	if (activeDecks.length === 0) {
		return (
			<main className="w-full space-y-6" style={style}>
				<div className="px-4 @lg:px-6 @xl:px-8">
					<AllDecksArchived />
				</div>
			</main>
		)
	}

	return (
		<AuthenticatedHome
			activeDecks={activeDecks}
			hasArchived={(decks?.length ?? 0) > activeDecks.length}
		/>
	)
}

function AuthenticatedHome({
	activeDecks,
	hasArchived,
}: {
	activeDecks: Array<DeckMetaType>
	hasArchived: boolean
}) {
	const { data: profile } = useProfile()
	const scores = useRecencyWeightedScores()
	const { dueMap, report } = useDueMap()

	const rankedDecks = useMemo(
		() => activeDecks.toSorted((a, b) => compareDecks(a, b, scores, dueMap)),
		[activeDecks, scores, dueMap]
	)

	const focus = rankedDecks.find((d) => (dueMap[d.lang]?.due ?? 0) > 0)
	const focusDue = focus ? (dueMap[focus.lang]?.due ?? 0) : 0

	const deckCount = activeDecks.length
	const languageSubtitle =
		deckCount === 1
			? `You're learning ${activeDecks[0].language}.`
			: deckCount === 2
				? `You're learning two languages.`
				: deckCount === 3
					? `You're learning three languages.`
					: `You're learning ${deckCount} languages.`

	const feedLang = rankedDecks[0].lang

	return (
		<main className="w-full space-y-8" style={style} data-testid="learn-page">
			{activeDecks.map((d) => (
				<DeckDueProbe key={d.lang} deck={d} onReport={report} />
			))}

			<WelcomeHeader
				username={profile?.username}
				subtitle={languageSubtitle}
				addPhraseLang={feedLang}
			/>

			<ReviewBanner focus={focus} focusDue={focusDue} />

			<section
				className="space-y-3"
				aria-labelledby="your-decks-heading"
				data-testid="your-decks-section"
			>
				<SectionLabel id="your-decks-heading">Your decks</SectionLabel>
				<div
					data-testid="decks-list-grid"
					className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @xl:grid-cols-3 @4xl:grid-cols-4"
				>
					{rankedDecks.map((d) => (
						<DeckTile key={d.lang} deck={d} />
					))}
					<AddDeckTile />
				</div>
				{hasArchived ? (
					<Link
						className="s-link-muted inline-flex items-center gap-1 text-xs"
						to="/learn/archived"
						data-testid="view-archived-decks-link"
					>
						<Archive size={12} />
						<span>View archived decks</span>
						<ChevronsRight className="h-4 w-3" />
					</Link>
				) : null}
			</section>

			<section
				className="space-y-3"
				aria-labelledby="community-feed-heading"
				data-testid="community-feed-section"
			>
				<SectionLabel id="community-feed-heading">
					Recent from the community
					{deckCount > 1 ? (
						<span className="text-muted-foreground ms-1 font-normal tracking-normal normal-case">
							· {languages[feedLang]}
						</span>
					) : null}
				</SectionLabel>
				<CommunityFeedSnippet lang={feedLang} />
			</section>
		</main>
	)
}

function SectionLabel({ id, children }: { id?: string; children: ReactNode }) {
	return (
		<h2
			id={id}
			className="text-muted-foreground text-xs font-semibold tracking-wider uppercase"
		>
			{children}
		</h2>
	)
}

function WelcomeHeader({
	username,
	subtitle,
	addPhraseLang,
}: {
	username: string | undefined
	subtitle: string
	addPhraseLang: string
}) {
	return (
		<header
			className="flex flex-col items-start justify-between gap-4 @md:flex-row @md:items-center"
			data-testid="learn-welcome-header"
		>
			<div>
				<h1 className="text-2xl leading-tight font-bold @md:text-3xl">
					Welcome back{username ? <>, {username}</> : null}
				</h1>
				<p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
			</div>
			<Link
				to="/learn/$lang/phrases/new"
				params={{ lang: addPhraseLang }}
				data-testid="add-phrase-button"
				className={buttonVariants({ variant: 'default' })}
			>
				<Plus />
				Add a phrase
			</Link>
		</header>
	)
}

function NoDecks() {
	return (
		<div className="space-y-6 py-6 text-center">
			<GarlicBroccoli />
			<p className="text-muted-foreground mb-4">
				You aren't learning any languages yet...
			</p>

			<Link to="/learn/add-deck" className={buttonVariants({ size: 'lg' })}>
				<Archive size={14} /> Start learning
				<ChevronsRight className="h-6 w-5" />
			</Link>
		</div>
	)
}

function AllDecksArchived() {
	return (
		<div className="py-12 text-center">
			<h3 className="mb-2 text-lg font-bold">No Active Decks</h3>
			<p className="text-muted-foreground mb-4">
				All your decks have been archived. Restore some to start studying, or
				start learning a new language deck.
			</p>

			<div className="mx-auto grid max-w-100 grid-cols-1 gap-4">
				<Link to="/learn/add-deck" className={buttonVariants({ size: 'lg' })}>
					<HeartPlus size={14} /> Start a new language{' '}
					<ChevronsRight className="h-6 w-5" />
				</Link>
				<Link
					to="/learn/archived"
					data-testid="view-archived-decks-link"
					className={buttonVariants({ variant: 'neutral', size: 'lg' })}
				>
					<Archive size={14} /> View archived decks{' '}
					<ChevronsRight className="h-6 w-5" />
				</Link>
			</div>
		</div>
	)
}

function BrowsePrompt() {
	return (
		<div
			className="space-y-6 py-6 text-center"
			data-testid="browse-languages-prompt"
		>
			<GarlicBroccoli />
			<h2 className="text-xl font-bold">Welcome to Sunlo</h2>
			<p className="text-muted-foreground mb-4">
				Explore community-created flashcards and language learning content.
			</p>

			<div className="mx-auto grid max-w-100 grid-cols-1 gap-4">
				<Link to="/signup" className={buttonVariants({ size: 'lg' })}>
					<UserPlus size={14} /> Create an account
					<ChevronsRight className="h-6 w-5" />
				</Link>
				<Link
					to="/login"
					className={buttonVariants({ variant: 'soft', size: 'lg' })}
				>
					<LogIn size={14} /> Log in
					<ChevronsRight className="h-6 w-5" />
				</Link>
				<Link
					to="/learn/browse"
					className={buttonVariants({ variant: 'neutral', size: 'lg' })}
				>
					<Compass size={14} /> Browse languages
					<ChevronsRight className="h-6 w-5" />
				</Link>
			</div>
		</div>
	)
}
