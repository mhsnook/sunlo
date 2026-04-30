import { createFileRoute, Link } from '@tanstack/react-router'
import * as z from 'zod'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Callout from '@/components/ui/callout'
import { ShowAndLogError } from '@/components/errors'
import { SelectOneLanguage } from '@/components/select-one-language'
import { useNewDeckMutation } from '@/features/deck/mutations'
import { useProfile } from '@/features/profile/hooks'
import languages from '@/lib/languages'
import { ErrorList } from '@/components/form/fields/error-list'
import { Loader } from '@/components/ui/loader'
import { useDecks } from '@/features/deck/hooks'
import { useDeckLangs } from '@/lib/hooks'
import { RequireAuth } from '@/components/require-auth'
import { Archive } from 'lucide-react'
import { useAppForm } from '@/components/form'

const SearchSchema = z.object({
	lang: z.string().optional(),
})

export const Route = createFileRoute('/_user/learn/add-deck')({
	validateSearch: SearchSchema,
	beforeLoad: () => ({
		titleBar: {
			title: 'Start A New Deck of Flashcards',
		},
	}),
	component: NewDeckForm,
})

const NewDeckSchema = z.object({
	lang: z
		.string({
			error: 'Select a language to start learning',
		})
		.length(3),
})

const HelloIcon = () => <span className="text-2xl">👋</span>

function NewDeckForm() {
	return (
		<RequireAuth message="You need to be logged in to create a new deck.">
			<NewDeckFormInner />
		</RequireAuth>
	)
}

function NewDeckFormInner() {
	const createNewDeck = useNewDeckMutation()
	const { data: profile, isLoading: profileLoading } = useProfile()
	const { data: decks, isLoading: decksLoading } = useDecks()
	const deckLangs = useDeckLangs()
	const archivedCount = decks?.filter((d) => d.archived).length ?? 0
	const search = Route.useSearch()

	const form = useAppForm({
		defaultValues: { lang: search.lang ?? '' },
		validators: { onChange: NewDeckSchema },
		onSubmit: async ({ value }) => {
			await createNewDeck.mutateAsync(value)
		},
	})

	if (profileLoading || decksLoading) return <Loader />

	return (
		<main>
			<Card>
				<CardHeader>
					<CardTitle>
						<>What language would you like to learn?</>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						data-testid="add-deck-form"
						name="new-deck"
						noValidate
						onSubmit={(e) => {
							e.preventDefault()
							e.stopPropagation()
							void form.handleSubmit()
						}}
						className="space-y-6"
					>
						{decks?.length === 0 ? (
							<Callout Icon={HelloIcon}>
								<p className="text-primary-foresoft text-2xl font-bold">
									Welcome <em>{profile?.username}</em>!
								</p>
								<p>
									Create a new deck to start learning, or click the "friends"
									link to look for your people.
								</p>
							</Callout>
						) : (
							<p>
								You're currently learning{' '}
								{decks?.map(({ lang }) => (
									<Badge key={lang} className="mx-1">
										{languages[lang]}
									</Badge>
								))}
							</p>
						)}
						<form.AppField name="lang">
							{(field) => {
								const meta = field.state.meta
								const showError = meta.isBlurred && meta.errors.length > 0
								return (
									<>
										<SelectOneLanguage
											hasError={showError}
											value={field.state.value ?? ''}
											setValue={(v) => {
												field.handleChange(v)
												field.handleBlur()
											}}
											disabled={deckLangs}
											size="lg"
										/>
										{showError && <ErrorList errors={meta.errors} />}
									</>
								)
							}}
						</form.AppField>
						<div className="flex flex-col items-center justify-between @lg:flex-row">
							<form.AppForm>
								<form.SubmitButton
									variant="default"
									size="lg"
									className="my-4"
									pendingText={`Starting ${search.lang ? languages[search.lang] : ''}...`}
								>
									Start learning {search.lang ? languages[search.lang] : ''}
								</form.SubmitButton>
							</form.AppForm>

							<Link
								to="/friends/chats"
								search={{ search: true }}
								className={buttonVariants({ variant: 'neutral' })}
							>
								Find your friends and contacts
							</Link>
						</div>
					</form>
					{archivedCount > 0 && (
						<Link
							to="/learn/archived"
							className="text-5-mlo-neutral hover:bg-1-mlo-primary hover:text-7-mid-primary mt-4 flex items-center gap-2 rounded-2xl p-3 text-sm"
						>
							<Archive className="size-4" />
							{archivedCount === 1
								? '1 of your decks is archived; view or re-enable it here'
								: `${archivedCount} of your decks are archived; view or re-enable them here`}
						</Link>
					)}
					<ShowAndLogError
						text="Problem creating new deck"
						error={createNewDeck.error}
					/>
				</CardContent>
			</Card>
		</main>
	)
}
