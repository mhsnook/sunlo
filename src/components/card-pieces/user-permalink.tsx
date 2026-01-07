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
}: {
	uid: uuid
	className?: string
	timeLinkTo?: string
	timeLinkParams?: Record<string, string>
	timeLinkSearch?: Record<string, string>
	timeValue?: string
	nonInteractive?: boolean
}) {
	const { data, isLoading } = useOnePublicProfile(uid)
	if (!uid || !data || isLoading) return null

	const avatarUrl = avatarUrlify(data.avatar_path)
	return (
		<div className="flex flex-row items-center gap-3">
			{avatarUrl ?
				<Link
					to="/friends/$uid"
					// oxlint-disable-next-line jsx-no-new-object-as-prop
					params={{ uid }}
					className={cn(`inline-flex flex-row`, className)}
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
				{data.username ?
					<p>{data.username}</p>
				:	null}
				{timeValue && timeLinkTo ?
					<Link
						to={timeLinkTo}
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={timeLinkParams}
						search={timeLinkSearch}
						className="s-link-hidden text-muted-foreground"
					>
						{ago(timeValue)}
					</Link>
				: timeValue ?
					<p className="text-muted-foreground">{ago(timeValue)}</p>
				:	null}
			</div>
		</div>
	)
}
