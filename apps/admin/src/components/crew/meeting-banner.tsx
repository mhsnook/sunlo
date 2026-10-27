import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useRouteContext } from '@tanstack/react-router'
import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toastError } from '@/components/ui/sonner'
import { meetingDue } from '../../../shared/crew'
import { dmClient, roomQuery } from '~/lib/crew'
import { dayLabel } from './crew-parts'

// The weekly meeting's standing invitation. It shows from the moment Riker's
// brief lands until the meeting closes, wherever the admin is.
export function MeetingBanner() {
	const { session } = useRouteContext({ from: '/_admin' })
	const { data: room } = useQuery(roomQuery())
	const navigate = useNavigate()
	const start = useMutation({
		mutationFn: () =>
			dmClient('riker', session.user.id).send({
				message: { kind: 'user', body: "Let's have our weekly meeting." },
			}),
		onSuccess: (admission) =>
			navigate({
				to: '/crew/$agent',
				params: { agent: 'riker' },
				search: { meeting: admission.submissionId },
			}),
		onError: (error) => toastError(error.message),
	})
	if (!room || !meetingDue(room.weekly)) return null
	return (
		<aside
			aria-label="Weekly meeting"
			data-testid="crew-meeting-banner"
			className="bg-primary-100 text-primary-900 flex flex-wrap items-center gap-3 px-4 py-2 text-sm"
		>
			<CalendarClock className="size-4 shrink-0" />
			<span className="me-auto">
				Riker’s brief is ready
				{room.weekly.briefAt ? ` (${dayLabel(room.weekly.briefAt)})` : ''}, and
				your weekly meeting hasn’t happened yet.
			</span>
			<Link to="/stack" className="underline">
				Read the brief
			</Link>
			<Button
				size="sm"
				disabled={start.isPending}
				data-testid="crew-start-meeting"
				onClick={() => start.mutate()}
			>
				Start the meeting
			</Button>
		</aside>
	)
}
