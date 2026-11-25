import { createFileRoute } from '@tanstack/react-router'
import { Bug, Library, Lightbulb, type LucideIcon } from 'lucide-react'
import { useAppForm } from '@/components/form'
import { ErrorList } from '@/components/form/fields/error-list'
import { LanguagePicker } from '@/components/fields/language-picker'
import { Button } from '@/components/ui/button'
import Callout from '@/components/ui/callout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChoiceTile } from '@/components/ui/choice-tile'
import { Label } from '@/components/ui/label'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'
import {
	FeedbackFormSchema,
	FeedbackKindSchema,
	useSendFeedback,
	type FeedbackFormType,
	type FeedbackKindType,
} from '@/features/feedback'
import { useAuth } from '@/lib/use-auth'

// `from` is the path the visitor was on when they chose "Send feedback".
type FeedbackSearch = { kind?: FeedbackKindType; lang?: string; from?: string }

export const Route = createFileRoute('/_user/feedback')({
	validateSearch: (search: Record<string, unknown>): FeedbackSearch => {
		const kind = FeedbackKindSchema.safeParse(search.kind)
		return {
			...(kind.success ? { kind: kind.data } : {}),
			...(typeof search.lang === 'string' && search.lang.length === 3
				? { lang: search.lang }
				: {}),
			...(typeof search.from === 'string' && search.from.startsWith('/')
				? { from: search.from.slice(0, 2000) }
				: {}),
		}
	},
	staticData: {
		titleBar: { title: 'Send feedback' },
	},
	component: FeedbackPage,
})

const kindChoices: Array<{
	kind: FeedbackKindType
	Icon: LucideIcon
	title: string
	description: string
	prompt: string
	placeholder: string
}> = [
	{
		kind: 'bug',
		Icon: Bug,
		title: 'Something is broken',
		description:
			"An error, or something that doesn't work the way you expected",
		prompt: 'What happened?',
		placeholder: 'What you did, what you expected, and what happened instead',
	},
	{
		kind: 'feature',
		Icon: Lightbulb,
		title: 'An idea for Sunlo',
		description: 'A feature you want, or a change to one',
		prompt: 'What would help you?',
		placeholder: 'What you want to do, and what gets in the way now',
	},
	{
		kind: 'library',
		Icon: Library,
		title: 'Something missing from the library',
		description: 'Phrases, translations or a language you need',
		prompt: 'What do you need?',
		placeholder: 'The phrases or topics you want to learn',
	},
]

function FeedbackPage() {
	const search = Route.useSearch()
	const { isAuth } = useAuth()
	const sendFeedback = useSendFeedback()

	const defaultValues: FeedbackFormType = {
		kind: search.kind ?? 'bug',
		message: '',
		lang: search.lang ?? '',
		contact_email: '',
	}
	const form = useAppForm({
		defaultValues,
		validators: { onChange: FeedbackFormSchema },
		onSubmit: async ({ value }) => {
			await sendFeedback.mutateAsync({
				...value,
				contact_email: isAuth ? '' : value.contact_email,
				page_url: search.from ?? null,
			})
		},
	})

	return (
		<Card
			className="mx-auto w-full max-w-xl [padding:clamp(0.5rem,2cqw,2rem)]"
			data-testid="feedback-page"
		>
			<CardHeader>
				<CardTitle>Send feedback</CardTitle>
			</CardHeader>
			<CardContent>
				{sendFeedback.isSuccess ? (
					<Callout Icon={SuccessCheckmarkTrans}>
						<p data-testid="feedback-sent-message">
							Thanks. Your feedback reached the Sunlo team.
						</p>
						<Button
							variant="neutral"
							className="mt-2"
							data-testid="feedback-send-another-button"
							onClick={() => {
								form.reset()
								sendFeedback.reset()
							}}
						>
							Send more feedback
						</Button>
					</Callout>
				) : (
					<form
						data-testid="feedback-form"
						noValidate
						className="space-y-6"
						onSubmit={(e) => {
							e.preventDefault()
							e.stopPropagation()
							void form.handleSubmit()
						}}
					>
						<form.Field name="kind">
							{(field) => (
								<fieldset
									className="space-y-2"
									data-testid="feedback-kind-options"
								>
									<legend className="mb-2 text-sm font-medium">
										What is it about?
									</legend>
									{kindChoices.map((choice) => (
										<ChoiceTile
											key={choice.kind}
											selected={field.state.value === choice.kind}
											onClick={() => field.handleChange(choice.kind)}
											data-key={choice.kind}
											className="flex w-full items-center gap-3 px-4 py-3 text-start"
										>
											<choice.Icon className="size-5 shrink-0" />
											<span>
												<span className="block font-medium">
													{choice.title}
												</span>
												<span className="text-muted-foreground block text-sm">
													{choice.description}
												</span>
											</span>
										</ChoiceTile>
									))}
								</fieldset>
							)}
						</form.Field>

						<form.Subscribe selector={(state) => state.values.kind}>
							{(kind) => {
								const choice =
									kindChoices.find((c) => c.kind === kind) ?? kindChoices[0]
								return (
									<>
										{kind === 'library' && (
											<form.Field name="lang">
												{(field) => (
													<div className="flex flex-col gap-1">
														<Label>Language (optional)</Label>
														<LanguagePicker
															value={field.state.value}
															setValue={(value) => field.handleChange(value)}
														/>
														<ErrorList errors={field.state.meta.errors} />
													</div>
												)}
											</form.Field>
										)}
										<form.AppField name="message">
											{(field) => (
												<field.TextareaInput
													label={choice.prompt}
													placeholder={choice.placeholder}
													rows={6}
												/>
											)}
										</form.AppField>
									</>
								)
							}}
						</form.Subscribe>

						{!isAuth && (
							<form.AppField name="contact_email">
								{(field) => (
									<field.EmailInput
										label="Email (optional)"
										description="Add it if you want a reply."
									/>
								)}
							</form.AppField>
						)}

						<form.AppForm>
							<form.SubmitButton pendingText="Sending...">
								Send feedback
							</form.SubmitButton>
						</form.AppForm>
						<form.AppForm>
							<form.FormAlert
								error={sendFeedback.error}
								text="Your feedback didn't send. Try again in a moment."
							/>
						</form.AppForm>
					</form>
				)}
			</CardContent>
		</Card>
	)
}
