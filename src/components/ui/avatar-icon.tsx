import { PublicProfile } from '@/types/main'
import { Link, ReactNode } from '@tanstack/react-router'
import { User } from 'lucide-react'

type AvatarIconRowProps = PublicProfile & {
	children?: ReactNode
}

export function AvatarIconRow({
	avatar_url,
	username,
	uid,
	children,
}: AvatarIconRowProps) {
	return (
		<div className="flex w-full flex-row items-center justify-between gap-4">
			<Link to="/friends/$uid" params={{ uid }}>
				{avatar_url ?
					<img
						src={avatar_url}
						aria-disabled="true"
						alt={`${username}'s avatar`}
						className="size-8 rounded-full object-cover"
					/>
				:	<User className="bg-foreground/20 size-8 rounded-full p-1" />}
			</Link>
			<p className="me-auto">
				<Link to="/friends/$uid" params={{ uid }}>
					{username}
				</Link>
			</p>
			{children}
		</div>
	)
}
