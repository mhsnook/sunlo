import { createFileRoute, Link } from '@tanstack/react-router'
import { useController, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { TitleBar } from '@/types/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Callout from '@/components/ui/callout'
import { ShowAndLogError } from '@/components/errors'
import { SelectOneLanguage } from '@/components/select-one-language'
import { useNewDeckMutation } from '@/lib/mutate-deck'
import { useProfile } from '@/hooks/use-profile'
import languages from '@/lib/languages'
import ErrorLabel from '@/components/fields/error-label'

const SearchSchema = z.object({
	lang: z.string().optional(),
})

export const Route = createFileRoute('/_user/learn/add-deck')({
	validateSearch: SearchSchema,
	loader: () => ({
		titleBar: {
			title: `Start Learning a New Language`,
		} as TitleBar,
	}),
	component: NewDeckForm,
})

const NewDeckSchema = z.object({
	lang: z
		.string({
			required_error: 'Select a language to start learning',
		})
		.length(3),
})

type FormValues = z.infer<typeof NewDeckSchema>

function NewDeckForm() {
	const createNewDeck = useNewDeckMutation()
	const { data } = useProfile()
	const search = Route.useSearch()
	const {
		control,
		handleSubmit,
		formState: { errors, isValid },
	} = useForm<FormValues>({
		resolver: zodResolver(NewDeckSchema),
		defaultValues: { lang: search.lang },
	})
	const controller = useController({ name: 'lang', control })

	const deckLanguages = data?.deckLanguages ?? []
	const showNewUserUI = data !== undefined && deckLanguages.length === 0

	return (
		<main className="w-app space-y-4 px-3 py-4">
			<Card>
				<CardHeader>
					<CardTitle>
						<>What language would you like to learn?</>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						name="new-deck"
						noValidate
						onSubmit={handleSubmit((data) => createNewDeck.mutate(data))}
						className="space-y-6"
					>
						{showNewUserUI ?
							<Callout Icon={() => <span>👋</span>}>
								<p>
									Welcome <em>{data?.username}</em>!
								</p>
								<p>
									Create a new deck to start learning, or go to your profile to
									check for friend requests.
								</p>
							</Callout>
						:	<p>
								You're currently learning{' '}
								{deckLanguages.map((l) => (
									<Badge key={l} className="mx-1">
										{languages[l]}
									</Badge>
								))}
							</p>
						}
						<SelectOneLanguage
							hasError={!!errors.lang}
							value={controller.field.value}
							setValue={controller.field.onChange}
							disabled={deckLanguages}
							size="lg"
						/>
						<ErrorLabel error={errors.lang} />
						<div className="flex flex-row items-center justify-between">
							<Button
								type="submit"
								variant="default"
								size="lg"
								className="my-4"
								disabled={createNewDeck.isPending || !isValid}
							>
								{createNewDeck.isPending ? 'Starting...' : 'Start learning'}
							</Button>
							{showNewUserUI ?
								<Link
									to={`/friends/search`}
									className={buttonVariants({ variant: 'secondary' })}
								>
									View friend requests
								</Link>
							:	null}
						</div>
					</form>
					<ShowAndLogError
						text="Problem creating new deck"
						error={createNewDeck.error}
					/>
				</CardContent>
			</Card>
		</main>
	)
}
