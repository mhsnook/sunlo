import type { TitleBar } from '@/types/main'

import { createFileRoute, Link } from '@tanstack/react-router'
import { useController, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

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
import { Loader } from '@/components/ui/loader'

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

const HelloIcon = () => <span className="text-2xl">👋</span>

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
	if (data === undefined) return <Loader />

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
						name="new-deck"
						noValidate
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onSubmit={handleSubmit((data) => createNewDeck.mutate(data))}
						className="space-y-6"
					>
						{data?.deckLanguages?.length === 0 ?
							<Callout Icon={HelloIcon}>
								<p className="text-primary-foresoft text-2xl font-bold">
									Welcome <em>{data?.username}</em>!
								</p>
								<p>
									Create a new deck to start learning, or click the "friends"
									link to look for your people.
								</p>
							</Callout>
						:	<p>
								You're currently learning{' '}
								{(data?.deckLanguages ?? []).map((l) => (
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
							disabled={data?.deckLanguages}
							size="lg"
						/>
						<ErrorLabel error={errors.lang} />
						<div className="flex flex-col items-center justify-between @lg:flex-row">
							<Button
								type="submit"
								variant="default"
								size="lg"
								className="my-4"
								disabled={createNewDeck.isPending || !isValid}
							>
								{createNewDeck.isPending ? 'Starting ' : 'Start learning '}
								{search.lang ? languages[search.lang] : ''}
								{createNewDeck.isPending ? '...' : ''}
							</Button>

							<Link
								to={`/friends/search`}
								className={buttonVariants({ variant: 'secondary' })}
							>
								Find your friends and contacts
							</Link>
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
