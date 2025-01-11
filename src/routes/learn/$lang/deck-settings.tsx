import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PostgrestError } from '@supabase/supabase-js'
import { zodResolver } from '@hookform/resolvers/zod'
import { type SubmitHandler, Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import toast from 'react-hot-toast'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

import { useDeckMeta } from '@/lib/use-deck'
import { DeckMeta, DeckRow } from '@/types/main'
import { LearningGoalField } from '@/components/fields/learning-goal-field'
import supabase from '@/lib/supabase-client'

export const Route = createFileRoute('/learn/$lang/deck-settings')({
	component: DeckSettingsPage,
})

function DeckSettingsPage() {
	const { lang } = Route.useParams()
	const { data: meta } = useDeckMeta(lang)
	return (
		<Card>
			<CardHeader>
				<CardTitle>Deck Settings</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<GoalForm meta={meta} />
				<ArchiveForm meta={meta} />
			</CardContent>
		</Card>
	)
}

const DeckGoalSchema = z.object({
	learning_goal: z.enum(['visiting', 'family', 'moving']),
	id: z.string().uuid(),
})

type DeckGoalFormInputs = z.infer<typeof DeckGoalSchema>

function GoalForm({ meta: { learning_goal, id, lang } }: { meta: DeckMeta }) {
	const queryClient = useQueryClient()
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isDirty },
	} = useForm<DeckGoalFormInputs>({
		resolver: zodResolver(DeckGoalSchema),
		defaultValues: { learning_goal, id },
	})

	const updateDeckGoalMutation = useMutation<
		DeckRow,
		PostgrestError,
		DeckGoalFormInputs
	>({
		mutationKey: ['user', lang, 'deck-settings'],
		mutationFn: async (values: DeckGoalFormInputs) => {
			const { data } = await supabase
				.from('user_deck')
				.update({ learning_goal: values.learning_goal })
				.eq('id', values.id)
				.throwOnError()
				.select()
			return data[0]
		},
		onSuccess: (data) => {
			toast.success('Your deck settings have been updated.')
			void queryClient.invalidateQueries({ queryKey: ['user', lang] })
			reset(data)
		},
		onError: () => {
			toast.error(
				'There was some issue and your deck settings were not updated.'
			)
		},
	})

	return (
		<Card>
			<CardHeader className="pb-0">
				<CardTitle>
					<h4 className="h4">Your learning goals</h4>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					noValidate
					// eslint-disable-next-line @typescript-eslint/no-misused-promises
					onSubmit={handleSubmit(
						updateDeckGoalMutation.mutate as SubmitHandler<DeckGoalFormInputs>
					)}
					className="space-y-4"
				>
					<Controller
						name="learning_goal"
						control={control}
						render={() => (
							<LearningGoalField
								control={control}
								error={errors.learning_goal}
							/>
						)}
					/>
					<div className="space-x-2">
						<Button type="submit" disabled={!isDirty}>
							Update your goal
						</Button>
						<Button
							variant="secondary"
							type="button"
							onClick={() => reset()}
							disabled={!isDirty}
						>
							Reset
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	)
}

function ArchiveForm({ meta: { id, archived, lang } }: { meta: DeckMeta }) {
	const [open, setOpen] = useState(false)
	const queryClient = useQueryClient()

	const mutation = useMutation({
		mutationFn: async () => {
			await supabase
				.from('user_deck')
				.update({ archived: !archived })
				.eq('id', id)
				.throwOnError()
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['user', lang] })
			if (archived) toast.success('The deck has been re-activated!')
			else
				toast.success(
					'The deck has been archived and hidden from your active decks.'
				)
			setOpen(false)
		},
		onError: () => {
			toast.error(`Failed to update deck status`)
		},
	})
	return (
		<Card>
			<CardHeader className="pb-0">
				<CardTitle>
					<h4 className="h4">
						{archived ? 'Reactivate deck' : 'Archive your deck'}
					</h4>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<AlertDialog open={open} onOpenChange={setOpen}>
					<AlertDialogTrigger asChild>
						{archived ?
							<Button variant="default" disabled={!archived}>
								Restore deck
							</Button>
						:	<Button variant="destructive-outline" disabled={archived}>
								Archive deck
							</Button>
						}
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								{archived ?
									'Restore this deck?'
								:	'Are you sure you want to archive this deck?'}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{archived ?
									`You can pick up right where you left off.`
								:	`This action will hide the deck from your active decks. You can unarchive it later if needed.`
								}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel
								className={buttonVariants({ variant: 'secondary' })}
							>
								Cancel
							</AlertDialogCancel>
							{archived ?
								<AlertDialogAction onClick={() => mutation.mutate()}>
									Restore
								</AlertDialogAction>
							:	<AlertDialogAction
									className={buttonVariants({ variant: 'destructive' })}
									onClick={() => mutation.mutate()}
								>
									Archive
								</AlertDialogAction>
							}
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</CardContent>
		</Card>
	)
}
