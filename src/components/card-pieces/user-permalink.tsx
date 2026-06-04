import { cn } from '@/lib/utils'
import { uuid } from '@/types/main'
import { Link } from '@tanstack/react-router'
import { ago, fullTimestamp } from '@/lib/dayjs'
import { useOnePublicProfile } from '@/features/social/public-profile'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useProfile } from '@/features/profile/hooks'

export function TinySelfAvatar({ className }: { className?: string }) {
	const { data } = useProfile()
	if (!data) return null
	return <UserAvatar profile={data} className={cn('size-8', className)} />
}

export function UidPermalink({
	uid,
	className,
	timeLinkTo,
	timeLinkParams,
	timeLinkSearch,
	timeValue,
	nonInteractive,
	action,
}: {
	uid: uuid
	className?: string
	timeLinkTo?: string
	timeLinkParams?: Record<string, string>
	timeLinkSearch?: Record<string, string>
	timeValue?: string
	nonInteractive?: boolean
	action?: string
}) {
	const { data, isLoading } = useOnePublicProfile(uid)
	if (!uid || !data || isLoading) return null

	return (
		<div className={cn('flex flex-row items-center gap-3', className)}>
			<Link
				to="/friends/$uid"
				params={{ uid }}
				className="inline-flex flex-row"
				disabled={nonInteractive}
			>
				<UserAvatar profile={data} />
			</Link>

			<div className="text-sm">
				<Link
					to="/friends/$uid"
					params={{ uid }}
					className="inline-flex flex-row hover:underline"
					disabled={nonInteractive}
				>
					<span className="font-medium">{data.username}</span>
				</Link>
				{timeValue && (
					<div className="text-muted-foreground">
						{timeLinkTo ? (
							<Link
								to={timeLinkTo}
								params={timeLinkParams}
								search={timeLinkSearch}
								title={fullTimestamp(timeValue)}
								className="s-link-hidden"
							>
								{action && (
									<span className="text-muted-foreground"> {action} </span>
								)}
								<time dateTime={timeValue}>{ago(timeValue)}</time>
							</Link>
						) : (
							<time dateTime={timeValue} title={fullTimestamp(timeValue)}>
								{ago(timeValue)}
							</time>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

export function UidPermalinkInline({
	uid,
	className,
	timeLinkTo,
	timeLinkParams,
	timeLinkSearch,
	timeValue,
	nonInteractive,
	action,
}: {
	uid: uuid
	className?: string
	timeLinkTo?: string
	timeLinkParams?: Record<string, string>
	timeLinkSearch?: Record<string, string>
	timeValue?: string
	nonInteractive?: boolean
	action?: string
}) {
	const { data, isLoading } = useOnePublicProfile(uid)
	if (!uid || !data || isLoading) return null

	return (
		<div className={cn('inline-flex flex-row items-center gap-2', className)}>
			<Link
				to="/friends/$uid"
				params={{ uid }}
				className="inline-flex flex-row hover:underline"
				disabled={nonInteractive}
			>
				<UserAvatar profile={data} className="size-6" />
			</Link>
			<div className="flex flex-row items-center gap-1.5 text-sm">
				<Link
					to="/friends/$uid"
					params={{ uid }}
					className="inline-flex flex-row hover:underline"
					disabled={nonInteractive}
				>
					<span className="font-medium">{data.username}</span>
				</Link>
				{timeValue && (
					<div className="text-muted-foreground">
						{timeLinkTo ? (
							<Link
								to={timeLinkTo}
								params={timeLinkParams}
								search={timeLinkSearch}
								title={fullTimestamp(timeValue)}
								className="s-link-hidden hover:underline"
							>
								{action && (
									<span className="text-muted-foreground">{action} </span>
								)}
								/ <time dateTime={timeValue}>{ago(timeValue)}</time>
							</Link>
						) : (
							<time dateTime={timeValue} title={fullTimestamp(timeValue)}>
								{ago(timeValue)}
							</time>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
