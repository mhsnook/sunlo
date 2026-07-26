import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { PublicProfileType } from '@/features/profile/schemas'
import { UserAvatar } from '@/components/ui/user-avatar'

type AvatarIconRowProps = PublicProfileType & {
	children?: ReactNode
}

export function AvatarIconRow({ children, ...profile }: AvatarIconRowProps) {
	return (
		<div className="flex w-full flex-row items-center gap-4">
			<Link
				to="/friends/$uid"
				params={{ uid: profile.uid }}
				className="hover:bg-lum-2 hover:bg-chroma-mlow hover:border-con-low hover:border-chroma-mlow flex grow flex-row items-center justify-start gap-4 rounded-2xl border border-transparent p-2"
			>
				<UserAvatar profile={profile} className="size-8" />
				<span>{profile.username}</span>
			</Link>
			{children}
		</div>
	)
}
