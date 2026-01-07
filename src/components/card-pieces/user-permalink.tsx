import { cn } from '@/lib/utils'
import { avatarUrlify } from '@/lib/hooks'
import { uuid } from '@/types/main'
import { Link } from '@tanstack/react-router'
import { ago } from '@/lib/dayjs'
import { useOnePublicProfile } from '@/hooks/use-public-profile'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

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

	const avatarUrl = avatarUrlify(data.avatar_path)
	return (
		<div className={cn('flex flex-row items-center gap-3', className)}>
			{avatarUrl ?
				<Link
					to="/friends/$uid"
					// oxlint-disable-next-line jsx-no-new-object-as-prop
					params={{ uid }}
					className="inline-flex flex-row"
					disabled={nonInteractive}
				>
					<Avatar className="bg-foreground text-background rounded-2xl">
						<AvatarImage src={avatarUrl} alt={`${data.username}'s avatar`} />
						<AvatarFallback className="mx-auto place-self-center font-bold">
							{data.username?.slice(0, 2)}
						</AvatarFallback>
					</Avatar>
				</Link>
			:	null}
			<div className="text-sm">
				<p>
					<span className="font-medium">{data.username}</span>
					{action && <span className="text-muted-foreground"> {action}</span>}
				</p>
				{timeValue && (
					<div className="text-muted-foreground">
						{timeLinkTo ?
							<Link
								to={timeLinkTo}
								// oxlint-disable-next-line jsx-no-new-object-as-prop
								params={timeLinkParams}
								search={timeLinkSearch}
								className="s-link-hidden"
							>
								{ago(timeValue)}
							</Link>
						:	ago(timeValue)}
					</div>
				)}
			</div>
		</div>
	)
}
