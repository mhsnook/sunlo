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
import { SidePanel } from './side-panel'

// The few things every agent knows about the admin, such as their name and
// how to refer to them. Only the admin writes here.
export function CommonKnowledgePanel({ onClose }: { onClose: () => void }) {
	const { data: entries } = useSuspenseQuery(commonKnowledgeQuery())
	const add = useAddCommonKnowledge()
	const edit = useEditCommonKnowledge()
	const forget = useForgetCommonKnowledge()
	const [draft, setDraft] = useState('')

	return (
		<SidePanel
			title="Common Knowledge"
			testId="common-knowledge"
			onClose={onClose}
			bodyClassName="space-y-4"
		>
			<p className="text-muted-foreground text-sm">
				What every agent knows about you, in every conversation: your name, how
				to refer to you, and the few things the whole crew should always keep in
				mind.
			</p>
			{entries.length > 0 && (
				<ul className="space-y-2">
					{entries.map((entry) => (
						<EditableEntry
							key={entry.id}
							id={entry.id}
							text={entry.text}
							label="Common Knowledge entry"
							busy={edit.isPending || forget.isPending}
							onSave={(text) => edit.mutateAsync({ id: entry.id, text })}
							onDelete={() => forget.mutateAsync(entry.id)}
							deleteLabel="Forget this"
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
		</SidePanel>
	)
}
