import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { User } from 'lucide-react'
import { PublicProfileType } from '@/lib/schemas'
import { avatarUrlify } from '@/lib/hooks'

type AvatarIconRowProps = PublicProfileType & {
	children?: ReactNode
}

export function AvatarIconRow({
	avatar_path,
	username,
	uid,
	children,
}: AvatarIconRowProps) {
	const avatarUrl = avatarUrlify(avatar_path)
	return (
		<div className="flex w-full flex-row items-center gap-4">
			<Link
				to="/friends/$uid"
				params={{ uid }}
				className="hover:bg-primary/10 hover:border-primary/20 flex grow flex-row items-center justify-start gap-4 rounded-2xl border border-transparent p-2"
			>
				{avatarUrl ?
					<img
						src={avatarUrl}
						alt={`${username}'s avatar`}
						className="rounded-squircle size-8 rounded-full object-cover"
					/>
				:	<User
						style={{ background: `#${uid.slice(-6)}44` }}
						className="bg-foreground/20 rounded-squircle size-8 rounded-full p-1"
					/>
				}
				<span>{username}</span>
			</Link>
			{children}
		</div>
	)
}
