import { useQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { meetingDue } from '../../../shared/crew'
import { commandQuery, roomQuery } from '~/lib/crew'
import { dayLabel } from '~/lib/format'

// The weekly meeting's standing invitation. It shows from the moment Riker's
// brief lands until the meeting closes, wherever the admin is. The meeting
// itself happens in the Command room.
export function MeetingBanner() {
	const { data: room } = useQuery(roomQuery())
	const { data: command } = useQuery(commandQuery())
	const inCommand = useRouterState({
		select: (state) => state.location.pathname === '/room/riker',
	})
	if (inCommand || !room?.weekly.briefAt || !meetingDue(room.weekly)) {
		return null
	}
	return (
		<aside
			aria-label="Weekly meeting"
			data-testid="crew-meeting-banner"
			className="bg-primary-100 text-primary-900 flex flex-wrap items-center gap-3 px-4 py-2 text-sm"
		>
			<CalendarClock className="size-4 shrink-0" />
			<span className="me-auto">
				{command?.meetingStartedAt
					? 'Your weekly meeting with Riker is under way.'
					: `Riker’s brief is ready (${dayLabel(room.weekly.briefAt)}), and your weekly meeting hasn’t happened yet.`}
			</span>
			<Button size="sm" asChild>
				<Link
					to="/room/$lead"
					params={{ lead: 'riker' }}
					data-testid="crew-go-to-meeting"
				>
					{command?.meetingStartedAt
						? 'Back to the meeting'
						: 'Go to the meeting'}
				</Link>
			</Button>
		</aside>
	)
}
