import { cn } from '@/lib/utils'
import { uuid } from '@/types/main'
import { Link } from '@tanstack/react-router'

export default function ({
	uid,
	username,
	avatarUrl,
	className,
}: {
	uid: uuid | null
	username: string | null
	avatarUrl: string | null
	className?: string
}) {
	if (!uid) return null

	return (
		<Link
			to="/friends/$uid"
			params={{ uid }}
			className={cn(
				`hover:outline-primary/30 text-primary-foresoft inline-flex flex-row place-items-baseline items-center gap-1 rounded-2xl hover:outline`,
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
