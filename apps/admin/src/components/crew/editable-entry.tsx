import { type ReactNode, useState } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toastError } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

const fail = (error: Error) => toastError(error.message)

// Text the admin can edit in place or delete: a charter entry, a
// Common Knowledge entry, or an agent's memory.
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
	// Shows the buttons only on hover or keyboard focus.
	quiet?: boolean
	className?: string
	testId: string
}) {
	const [draft, setDraft] = useState<string | null>(null)
	const save = () =>
		draft?.trim() && onSave(draft.trim()).then(() => setDraft(null), fail)
	const buttonClass = cn(
		quiet && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
	)

	return (
		<li
			className={cn('group flex items-start gap-2 text-sm', className)}
			data-testid={testId}
			data-key={id}
		>
			{leading}
			{draft === null ? (
				<span className="flex-1 whitespace-pre-wrap">{children}</span>
			) : (
				<Textarea
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Escape') setDraft(null)
						if (event.key === 'Enter' && !event.shiftKey) {
							event.preventDefault()
							void save()
						}
					}}
					className="min-h-10 flex-1"
					rows={2}
					aria-label={label}
					ref={(field) => field?.focus()}
				/>
			)}
			{draft === null ? (
				<>
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
						<Trash2 />
					</Button>
				</>
			) : (
				<>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Save"
						disabled={busy || !draft.trim()}
						onClick={() => void save()}
					>
						<Check />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Cancel"
						onClick={() => setDraft(null)}
					>
						<X />
					</Button>
				</>
			)}
		</li>
	)
}
