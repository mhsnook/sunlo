import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Bubble } from '@/components/ui/bubble'
import { Button } from '@/components/ui/button'
import { toastError } from '@/components/ui/sonner'
import { isCrewKey, type CrewMessageType } from '../../../shared/crew'
import { usePickView } from '~/lib/crew'
import { AgentAvatar, CrewText } from './crew-parts'

// An associate's answer that differs from the principal's, folded under the
// principal's message. The admin opens it, then goes with one of the two;
// both agents hear which.
export function OtherView({
	original,
	other,
}: {
	original: CrewMessageType
	other: CrewMessageType
}) {
	const [open, setOpen] = useState(false)
	const pick = usePickView()
	const choose = (chosen: 'original' | 'other') =>
		pick.mutate(
			{ messageId: other.id, chosen },
			{ onError: (error) => toastError(error.message) }
		)
	const picked = other.pick
	return (
		<div
			className="space-y-2"
			data-testid="crew-other-view"
			data-key={other.id}
		>
			<Button
				variant="ghost"
				size="sm"
				className="text-muted-foreground h-7 px-2 shadow-none"
				aria-expanded={open}
				data-testid="crew-other-view-toggle"
				onClick={() => setOpen((on) => !on)}
			>
				<ChevronDown className={open ? 'rotate-180' : undefined} />
				{other.authorName} sees it differently
			</Button>
			{open && (
				<div className="flex gap-2">
					{isCrewKey(other.author) && (
						<AgentAvatar agent={other.author} size="sm" />
					)}
					<Bubble
						variant="outline"
						align="start"
						className="min-w-0 whitespace-normal"
					>
						<CrewText text={other.body} />
					</Bubble>
				</div>
			)}
			{picked ? (
				<p
					className="text-muted-foreground px-1 text-xs"
					data-testid="crew-picked"
				>
					{picked.by} went with{' '}
					{picked.chosen === 'other' ? other.authorName : original.authorName}
					’s view
				</p>
			) : (
				open && (
					<div className="flex flex-wrap gap-1">
						{(['original', 'other'] as const).map((chosen) => (
							<Button
								key={chosen}
								size="sm"
								variant="soft"
								disabled={pick.isPending}
								data-testid="crew-pick"
								data-key={chosen}
								onClick={() => choose(chosen)}
							>
								Go with{' '}
								{chosen === 'other' ? other.authorName : original.authorName}
							</Button>
						))}
					</div>
				)
			)}
		</div>
	)
}
