import { type ReactNode, useRef, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toastError } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

const fail = (error: Error) => toastError(error.message)

// Text the admin can edit in a dialog or delete: a charter entry, a Common
// Knowledge entry, or an agent's memory, to-do or open item.
export function EditableEntry({
	id,
	text,
	label,
	leading,
	children,
	busy,
	onSave,
	onDelete,
	deleteLabel,
	deleteIcon = <Trash2 />,
	quiet = false,
	className,
	testId,
}: {
	id: number
	text: string
	label: string
	leading?: ReactNode
	children: ReactNode
	busy: boolean
	onSave: (text: string) => Promise<unknown>
	onDelete: () => Promise<unknown>
	deleteLabel: string
	deleteIcon?: ReactNode
	// Shows the buttons only on hover or keyboard focus.
	quiet?: boolean
	className?: string
	testId: string
}) {
	const [draft, setDraft] = useState<string | null>(null)
	const field = useRef<HTMLTextAreaElement>(null)
	const save = () =>
		draft?.trim() && onSave(draft.trim()).then(() => setDraft(null), fail)
	const buttonClass = cn(
		quiet &&
			'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100'
	)

	return (
		<li
			className={cn('group flex items-start gap-2 text-sm', className)}
			data-testid={testId}
			data-key={id}
		>
			{leading}
			<span className="flex-1 whitespace-pre-wrap">
				{children}
				{/* Trails the last line so the text wraps the full width; h-5 is
				    the line's height, so a 32px button does not tallen it. */}
				<span className="ms-1 inline-flex h-5 items-center gap-0.5 align-middle">
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Edit this ${label.toLowerCase()}`}
						className={buttonClass}
						onClick={() => setDraft(text)}
					>
						<Pencil />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						aria-label={deleteLabel}
						className={buttonClass}
						disabled={busy}
						onClick={() => void onDelete().catch(fail)}
					>
						{deleteIcon}
					</Button>
				</span>
			</span>
			<Dialog
				open={draft !== null}
				onOpenChange={(open) => !open && setDraft(null)}
			>
				<DialogContent className="max-w-xl" initialFocus={field}>
					<DialogHeader>
						<DialogTitle>Edit {label.toLowerCase()}</DialogTitle>
					</DialogHeader>
					<Textarea
						value={draft ?? ''}
						onChange={(event) => setDraft(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter' && !event.shiftKey) {
								event.preventDefault()
								void save()
							}
						}}
						className="min-h-48"
						rows={8}
						aria-label={label}
						ref={field}
						onFocus={(event) => {
							const end = event.target.value.length
							event.target.setSelectionRange(end, end)
						}}
					/>
					<div className="flex justify-end gap-2">
						<Button variant="ghost" onClick={() => setDraft(null)}>
							Cancel
						</Button>
						<Button
							disabled={busy || !draft?.trim()}
							onClick={() => void save()}
						>
							Save
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</li>
	)
}
