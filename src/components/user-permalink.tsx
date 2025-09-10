import { uuid } from '@/types/main'
import { Link } from '@tanstack/react-router'

export default function ({
	uid,
	username,
	avatarUrl,
}: {
	uid: uuid | null
	username: string | null
	avatarUrl: string | null
}) {
	if (!uid) return null

	return (
		<Link
			to="/friends/$uid"
			params={{ uid }}
			className="s-link-hidden inline-flex flex-row place-items-baseline items-center gap-0.5"
		>
			{username ?
				<span>{username}</span>
			:	null}
			{avatarUrl ?
				<img
					src={avatarUrl}
					alt={`${username}'s avatar`}
					className="aspect-square w-5 object-cover"
				/>
			:	null}
		</Link>
	)
}
