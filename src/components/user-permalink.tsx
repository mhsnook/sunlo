import { useAvatarUrl } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { uuid } from '@/types/main'
import { Link } from '@tanstack/react-router'

export default function UserPermalink({
	uid,
	username,
	avatar_path,
	className,
	round = false,
}: {
	uid: uuid | null
	username: string | null
	avatar_path: string | null | undefined
	className?: string
	round?: boolean
}) {
	const avatarUrl = useAvatarUrl(avatar_path)
	if (!uid) return null

	return (
		<Link
			to="/friends/$uid"
			// oxlint-disable-next-line jsx-no-new-object-as-prop
			params={{ uid }}
			className={cn(
				round ?
					`hover:outline-primary/30 rounded-2xl hover:outline`
				:	`s-link-hidden text-primary-foresoft`,
				`text-primary-foresoft inline-flex flex-row place-items-baseline items-center gap-1`,
				className
			)}
		>
			{username ?
				<span>{username}</span>
			:	null}
			{avatarUrl ?
				<img
					src={avatarUrl}
					alt={`${username}'s avatar`}
					className="aspect-square w-5 rounded-2xl object-cover"
				/>
			:	null}
		</Link>
	)
}
