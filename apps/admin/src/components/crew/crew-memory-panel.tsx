import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toastError } from '@/components/ui/sonner'
import {
	crewMemoryQuery,
	useAddCrewMemory,
	useForgetCrewMemory,
} from '~/lib/crew'

// The few things every agent knows about the admin, such as their name and
// how to refer to them. Only the admin writes here.
export function CrewMemoryPanel({ onClose }: { onClose: () => void }) {
	const { data: entries } = useSuspenseQuery(crewMemoryQuery())
	const add = useAddCrewMemory()
	const forget = useForgetCrewMemory()
	const [draft, setDraft] = useState('')

	return (
		<aside
			aria-label="Crew memory"
			data-testid="crew-memory"
			className="bg-background flex h-full w-full flex-col border-s md:w-96"
		>
			<div className="flex items-center gap-2 border-b px-4 py-3">
				<h2 className="me-auto font-semibold">Crew memory</h2>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Close the crew memory"
					onClick={onClose}
				>
					<X />
				</Button>
			</div>
			<div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
				<p className="text-muted-foreground text-sm">
					What every agent knows about you, in every conversation: your name,
					how to refer to you, and the few things the whole crew should always
					keep in mind.
				</p>
				{entries.length > 0 && (
					<ul className="space-y-2">
						{entries.map((entry) => (
							<li
								key={entry.id}
								className="bg-card flex items-start gap-2 rounded border p-3 text-sm"
								data-testid="crew-memory-entry"
								data-key={entry.id}
							>
								<span className="me-auto whitespace-pre-wrap">
									{entry.text}
								</span>
								<Button
									variant="ghost"
									size="icon"
									aria-label="Forget this"
									disabled={forget.isPending}
									onClick={() =>
										forget.mutate(entry.id, {
											onError: (error) => toastError(error.message),
										})
									}
								>
									<Trash2 />
								</Button>
							</li>
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
						data-testid="crew-memory-input"
					/>
					<Button
						type="submit"
						size="sm"
						disabled={!draft.trim() || add.isPending}
						data-testid="crew-memory-add"
					>
						Add for the whole crew
					</Button>
				</form>
			</div>
		</aside>
	)
}
