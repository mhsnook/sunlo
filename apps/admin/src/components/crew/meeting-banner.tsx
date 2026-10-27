import { useQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { meetingDue } from '../../../shared/crew'
import { roomQuery } from '~/lib/crew'
import { dayLabel } from '~/lib/format'

// The weekly meeting's standing invitation. It shows from the moment Riker's
// brief lands until the meeting closes, wherever the admin is. The meeting
// itself happens in the Enterprise thread.
export function MeetingBanner() {
	const { data: room } = useQuery(roomQuery())
	const onBridge = useRouterState({
		select: (state) => state.location.pathname === '/enterprise',
	})
	if (onBridge || !room?.weekly.briefAt || !meetingDue(room.weekly)) {
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
				Riker’s brief is ready ({dayLabel(room.weekly.briefAt)}), and your
				weekly meeting hasn’t happened yet.
			</span>
			<Button size="sm" asChild>
				<Link to="/enterprise" data-testid="crew-go-to-meeting">
					Go to the meeting
				</Link>
			</Button>
		</aside>
	)
}
