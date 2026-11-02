import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { displayName, type CrewKey } from '../../../shared/crew'
import { CrewText } from './crew-parts'

// Who an officer is and how it works: the persona its every run starts
// from. It lives in code (shared/characters.ts), so the admin only reads it.
export function CharacterView({
	agent,
	character,
}: {
	agent: CrewKey
	character: string
}) {
	const [open, setOpen] = useState(false)
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
				Who {displayName(agent)} is
			</Button>
			{open && (
				<div
					className="bg-card max-h-80 overflow-y-auto rounded border p-3 text-sm"
					data-testid="agent-character-text"
				>
					<CrewText text={character} />
				</div>
			)}
		</section>
	)
}
