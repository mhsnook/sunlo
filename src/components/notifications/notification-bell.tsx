import { Link } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useUnreadCount } from '@/features/notifications/hooks'
import { useAuth } from '@/lib/use-auth'

export function NotificationBell() {
	const { isAuth } = useAuth()
	const unreadCount = useUnreadCount()

	if (!isAuth) return null

	return (
		<Link
			to="/notifications"
			className="btn btn-size-icon btn-variant-ghost"
			aria-label="Notifications"
			data-testid="notification-bell"
		>
			<div className="relative">
				<Bell className="h-5 w-5" />
				{!!unreadCount && (
					<Badge
						size="sm"
						className="absolute -end-2 -top-2 min-w-4 justify-center"
						data-testid="notification-badge"
					>
						{unreadCount > 99 ? '99+' : unreadCount}
					</Badge>
				)}
			</div>
		</Link>
	)
}
