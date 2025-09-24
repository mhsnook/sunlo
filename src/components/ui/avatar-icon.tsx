import { PublicProfile } from '@/types/main'
import { Link, ReactNode } from '@tanstack/react-router'
import { User } from 'lucide-react'

type AvatarIconRowProps = PublicProfile & {
	children?: ReactNode
}

export function AvatarIconRow({
	avatarUrl,
	username,
	uid,
	children,
}: AvatarIconRowProps) {
	return (
		<div className="flex w-full flex-row items-center gap-4">
			<Link
				to="/friends/$uid"
				// oxlint-disable-next-line jsx-no-new-object-as-prop
				params={{ uid }}
				className="hover:bg-primary/10 hover:border-primary/20 flex grow flex-row items-center justify-start gap-4 rounded-2xl border border-transparent p-2"
			>
				{avatarUrl ?
					<img
						src={avatarUrl}
						alt={`${username}'s avatar`}
						className="size-8 rounded-full object-cover"
					/>
				:	<User className="bg-foreground/20 size-8 rounded-full p-1" />}
				<span>{username}</span>
			</Link>
			{children}
		</div>
	)
}
