import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
	draftBody,
	type CrewMessageType,
	type GithubDraftType,
} from '../../../shared/crew'
import { useFileDraft } from '~/lib/crew'
import { CardActions, CardFrame, CrewText } from './crew-parts'

const draftLabel = (draft: GithubDraftType) =>
	draft.type === 'issue'
		? draft.labels.includes('epic')
			? 'New epic for GitHub'
			: 'New issue for GitHub'
		: draft.type === 'milestone'
			? 'New milestone for GitHub'
			: `Comment on #${draft.issue} for GitHub`

// A draft an agent made for GitHub. The admin can edit it, then file it;
// what they file is published as it stands on the card.
export function GithubCard({
	message,
	draft,
}: {
	message: CrewMessageType
	draft: GithubDraftType
}) {
	const [shown, setShown] = useState(draft)
	const [editing, setEditing] = useState(false)
	const file = useFileDraft()
	const open = !message.answer

	return (
		<CardFrame
			kind="github"
			label={draftLabel(shown)}
			brief={[
				shown.type === 'comment' ? null : shown.title,
				draftBody(shown),
				message.answer?.url,
			]}
		>
			<div className="text-muted-foreground text-sm">
				<CrewText text={message.body} />
			</div>
			{editing ? (
				<DraftEditor draft={shown} onChange={setShown} />
			) : (
				<DraftView draft={shown} />
			)}
			{file.isError && (
				<p className="text-danger-700 text-xs" data-testid="crew-card-error">
					{file.error.message}
				</p>
			)}
			<CardActions
				message={message}
				primary={
					open && (
						<>
							<Button
								size="sm"
								disabled={file.isPending}
								data-testid="crew-card-file"
								onClick={() =>
									file.mutate(
										{ messageId: message.id, draft: shown },
										{ onSuccess: () => setEditing(false) }
									)
								}
							>
								File it
							</Button>
							<Button
								size="sm"
								variant="ghost"
								aria-pressed={editing}
								data-testid="crew-card-edit"
								onClick={() => setEditing((on) => !on)}
							>
								<Pencil /> {editing ? 'Done editing' : 'Edit'}
							</Button>
						</>
					)
				}
			/>
		</CardFrame>
	)
}

function DraftView({ draft }: { draft: GithubDraftType }) {
	return (
		<div className="space-y-2 rounded border p-3" data-testid="github-draft">
			{draft.type !== 'comment' && (
				<p className="text-sm font-semibold">{draft.title}</p>
			)}
			{draft.type === 'issue' && (
				<p className="text-muted-foreground flex flex-wrap gap-1 text-xs">
					{draft.labels.map((label) => (
						<span key={label} className="bg-muted rounded px-1.5 py-0.5">
							{label}
						</span>
					))}
					{draft.milestoneTitle && <span>in {draft.milestoneTitle}</span>}
				</p>
			)}
			{draft.type === 'milestone' && draft.dueOn && (
				<p className="text-muted-foreground text-xs">Due {draft.dueOn}</p>
			)}
			<div className="max-h-96 overflow-y-auto text-sm">
				<CrewText text={draftBody(draft)} />
			</div>
		</div>
	)
}

function DraftEditor({
	draft,
	onChange,
}: {
	draft: GithubDraftType
	onChange: (draft: GithubDraftType) => void
}) {
	return (
		<div className="space-y-2" data-testid="github-draft-editor">
			{draft.type !== 'comment' && (
				<Input
					value={draft.title}
					onChange={(event) =>
						onChange({ ...draft, title: event.target.value })
					}
					aria-label="Title"
					data-testid="github-draft-title"
				/>
			)}
			{draft.type === 'issue' && (
				<Input
					value={draft.labels.join(', ')}
					onChange={(event) =>
						onChange({
							...draft,
							labels: event.target.value
								.split(',')
								.map((label) => label.trim())
								.filter(Boolean),
						})
					}
					aria-label="Labels, separated by commas"
					placeholder="Labels, separated by commas"
					data-testid="github-draft-labels"
				/>
			)}
			{draft.type === 'milestone' && (
				<Input
					type="date"
					value={draft.dueOn ?? ''}
					onChange={(event) =>
						onChange({ ...draft, dueOn: event.target.value || null })
					}
					aria-label="Due date"
					data-testid="github-draft-due"
				/>
			)}
			<Textarea
				value={draftBody(draft)}
				onChange={(event) =>
					onChange(
						draft.type === 'milestone'
							? { ...draft, description: event.target.value }
							: { ...draft, body: event.target.value }
					)
				}
				rows={14}
				className="font-mono text-xs"
				aria-label="Text, in Markdown"
				data-testid="github-draft-body"
			/>
		</div>
	)
}
