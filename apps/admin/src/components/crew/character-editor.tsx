import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import {
	displayName,
	type CharacterType,
	type CrewKey,
} from '../../../shared/crew'
import { useRestoreCharacter, useSetCharacter } from '~/lib/crew'
import { dayLabel } from '~/lib/format'

const fail = (error: Error) => toastError(error.message)

// Who an officer is and how it works: the persona its every run starts
// from. The admin can rewrite it, and restore the original from code.
export function CharacterEditor({
	agent,
	character,
}: {
	agent: CrewKey
	character: CharacterType
}) {
	const name = displayName(agent)
	const save = useSetCharacter(agent)
	const restore = useRestoreCharacter(agent)
	const [open, setOpen] = useState(false)
	const [draft, setDraft] = useState<string | null>(null)
	const busy = save.isPending || restore.isPending

	return (
		<section
			className="space-y-2"
			data-testid="agent-character"
			data-key={agent}
		>
			<Button
				variant="ghost"
				size="sm"
				className="-ms-2"
				aria-expanded={open}
				onClick={() => setOpen((value) => !value)}
				data-testid="agent-character-toggle"
			>
				{open ? <ChevronDown /> : <ChevronRight />}
				Who {name} is
				<span className="text-muted-foreground font-normal">
					{character.editedAt
						? `· your version, ${dayLabel(character.editedAt)}`
						: '· as written in code'}
				</span>
			</Button>
			{open && draft === null && (
				<div className="space-y-2">
					<p
						className="bg-card max-h-80 overflow-y-auto rounded border p-3 text-sm whitespace-pre-wrap"
						data-testid="agent-character-text"
					>
						{character.text}
					</p>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							size="sm"
							variant="soft"
							onClick={() => setDraft(character.text)}
							data-testid="agent-character-edit"
						>
							Edit
						</Button>
						{character.editedAt && (
							<Button
								size="sm"
								variant="ghost"
								disabled={busy}
								onClick={() =>
									restore.mutate(undefined, {
										onSuccess: () =>
											toastSuccess(`${name}'s original restored`),
										onError: fail,
									})
								}
								data-testid="agent-character-restore"
							>
								Restore the original
							</Button>
						)}
						<span className="text-muted-foreground text-xs">
							{name} hears about each change you make here on its next run.
						</span>
					</div>
				</div>
			)}
			{open && draft !== null && (
				<form
					className="space-y-2"
					onSubmit={(event) => {
						event.preventDefault()
						const text = draft.trim()
						if (!text) return
						save.mutate(text, {
							onSuccess: () => {
								setDraft(null)
								toastSuccess(`${name}'s character saved`)
							},
							onError: fail,
						})
					}}
				>
					<Textarea
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						rows={18}
						aria-label={`Who ${name} is`}
						className="font-mono text-xs"
						data-testid="agent-character-input"
					/>
					<div className="flex gap-2">
						<Button
							type="submit"
							size="sm"
							disabled={busy || !draft.trim()}
							data-testid="agent-character-save"
						>
							Save
						</Button>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => setDraft(null)}
						>
							Cancel
						</Button>
					</div>
				</form>
			)}
		</section>
	)
}
