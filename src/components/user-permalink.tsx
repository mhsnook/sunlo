import { cn } from '@/lib/utils'
import { avatarUrlify } from '@/lib/hooks'
import { uuid } from '@/types/main'
import { Link } from '@tanstack/react-router'

export default function UserPermalink({
	uid,
	username,
	avatar_path,
	className,
	round = false,
}: {
	uid: uuid | null | undefined
	username: string | null | undefined
	avatar_path: string | null | undefined
	className?: string
	round?: boolean
}) {
	if (!uid) return null
	const avatarUrl = avatarUrlify(avatar_path)
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
