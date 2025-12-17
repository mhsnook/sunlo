import { cn } from '@/lib/utils'
import { avatarUrlify } from '@/lib/hooks'
import { uuid } from '@/types/main'
import { Link } from '@tanstack/react-router'
import { ago } from '@/lib/dayjs'
import { useOnePublicProfile } from '@/hooks/use-public-profile'
import { Avatar } from '../ui/avatar'
import { AvatarFallback, AvatarImage } from '@radix-ui/react-avatar'

export function UidPermalink({ uid, ...args }: { uid: uuid; args: unknown }) {
	const { data, isLoading } = useOnePublicProfile(uid)
	return (
		isLoading ? null
		: !data ? <>profile not found</>
		: <UserPermalink
				uid={uid}
				username={data?.username}
				avatar_path={data?.avatar_path}
				{...args}
			/>
	)
}

export default function UserPermalink({
	uid,
	username,
	avatar_path,
	className,
	timeLinkTo,
	timeLinkParams,
	timeLinkSearch,
	timeValue,
	nonInteractive,
}: {
	uid: uuid | null | undefined
	username: string | null | undefined
	avatar_path: string | null | undefined
	className?: string
	timeLinkTo?: string
	timeLinkParams?: Record<string, string>
	timeLinkSearch?: Record<string, string>
	timeValue?: string
	nonInteractive?: boolean
}) {
	if (!uid) return null
	const avatarUrl = avatarUrlify(avatar_path)
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
						<AvatarImage src={avatarUrl} alt={`${username}'s avatar`} />
						<AvatarFallback className="mx-auto place-self-center font-bold">
							{username?.slice(0, 2)}
						</AvatarFallback>
					</Avatar>
				</Link>
			:	null}
			<div className="text-sm">
				{username ?
					<p>{username}</p>
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
