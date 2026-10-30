import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toastError } from '@/components/ui/sonner'
import {
	commonKnowledgeQuery,
	useAddCommonKnowledge,
	useEditCommonKnowledge,
	useForgetCommonKnowledge,
} from '~/lib/crew'
import { EditableEntry } from './editable-entry'
import { Section } from './workspace-parts'

// The crew's charter, in the Common Room's details: the few things every
// agent knows about the admin, such as their name and how to refer to them,
// which each room's charter builds on. Only the admin writes here. The code
// and the API still call it Common Knowledge; only what the admin sees says
// charter.
export function CrewCharterSection() {
	const { data: entries } = useSuspenseQuery(commonKnowledgeQuery())
	const add = useAddCommonKnowledge()
	const edit = useEditCommonKnowledge()
	const forget = useForgetCommonKnowledge()
	const [draft, setDraft] = useState('')

	return (
		<Section
			title={`The crew's charter: what every agent knows about you · ${entries.length}`}
		>
			<div className="space-y-4" data-testid="common-knowledge">
				<p className="text-muted-foreground text-sm">
					In every room and every conversation: your name, how to refer to you,
					and the few things the whole crew should always keep in mind. Each
					room's charter builds on it.
				</p>
				{entries.length > 0 && (
					<ul className="space-y-2">
						{entries.map((entry) => (
							<EditableEntry
								key={entry.id}
								id={entry.id}
								text={entry.text}
								label="Charter entry"
								busy={edit.isPending || forget.isPending}
								onSave={(text) => edit.mutateAsync({ id: entry.id, text })}
								onDelete={() => forget.mutateAsync(entry.id)}
								deleteLabel="Drop this entry"
								className="bg-card rounded border p-3"
								testId="common-knowledge-entry"
							>
								{entry.text}
							</EditableEntry>
						))}
					</ul>
				)}
				<form
					className="space-y-2"
					onSubmit={(event) => {
						event.preventDefault()
						const text = draft.trim()
						if (!text) return
						add.mutate(text, {
							onSuccess: () => setDraft(''),
							onError: (error) => toastError(error.message),
						})
					}}
				>
					<Textarea
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						placeholder="Name is Sam, she/her. Also goes by Captain."
						rows={3}
						data-testid="common-knowledge-input"
					/>
					<Button
						type="submit"
						size="sm"
						disabled={!draft.trim() || add.isPending}
						data-testid="common-knowledge-add"
					>
						Add for the whole crew
					</Button>
				</form>
			</div>
		</Section>
	)
}
