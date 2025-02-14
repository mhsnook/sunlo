import { createFileRoute, Link } from '@tanstack/react-router'
import { SubmitHandler, useController, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShowError } from '@/components/errors'
import { SelectOneLanguage } from '@/components/select-one-language'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { useNewDeckMutation } from '@/lib/mutate-deck'
import { useProfile } from '@/lib/use-profile'
import { NavbarData } from '@/types/main'
import { Badge } from '@/components/ui/badge'
import languages from '@/lib/languages'
import Callout from '@/components/ui/callout'
import { ErrorLabel } from '@/components/fields'
import { RouteIcon } from 'lucide-react'

export const Route = createFileRoute('/_user/learn/add-deck')({
	loader: () => ({
		titleBar: {
			title: `Start Learning a New Language`,
			Icon: RouteIcon,
		} as NavbarData,
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
	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<FormValues>({
		resolver: zodResolver(NewDeckSchema),
	})
	const controller = useController({ name: 'lang', control })

	const deckLanguages = data?.deckLanguages ?? []
	const showNewUserUI = data !== undefined && deckLanguages.length === 0

	return (
		<main className="w-app px-3 @sm:px-[6%] space-y-4 py-6">
			<form
				name="new-deck"
				noValidate
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={handleSubmit(
					createNewDeck.mutate as SubmitHandler<FormValues>
				)}
				className="space-y-4"
			>
				{showNewUserUI ?
					<Callout>
						<span>👋</span>
						<div className="space-y-2">
							<p>
								Welcome <em>{data?.username}</em>!
							</p>
							<p>
								Create a new deck to start learning, or go to your profile to
								check for friend requests.
							</p>
						</div>
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
				<h2 className="h3">What language would you like to learn?</h2>
				<SelectOneLanguage
					autoFocus
					hasError={!!errors.lang}
					value={controller.field.value}
					setValue={controller.field.onChange}
					disabled={deckLanguages}
				/>
				<ErrorLabel {...errors.lang} />

				<Button
					type="submit"
					variant="default"
					className="my-6"
					disabled={createNewDeck.isPending}
				>
					{createNewDeck.isPending ? 'Starting...' : 'Start learning'}
				</Button>
				{showNewUserUI ?
					<Link
						to={`/friends/search`}
						className={buttonVariants({ variant: 'link' })}
					>
						View friend requests
					</Link>
				:	null}
			</form>
			<ShowError>{createNewDeck.error?.message}</ShowError>
		</main>
	)
}
