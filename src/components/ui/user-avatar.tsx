import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { avatarUrlify } from '@/lib/hooks'
import type { PublicProfileType } from '@/features/profile/schemas'

/**
 * The canonical way to render any user's avatar: their uploaded image with a
 * seeded, bold-colour initials fallback (the squircle treatment lives on
 * `Avatar`). Used wherever a person shows up — friend pickers, profile rows,
 * permalinks, chat, nav. Pass a `PublicProfileType` (or any superset, e.g.
 * the signed-in `MyProfile`); size overrides go through `className`.
 *
 * Only have a `uid`? Fetch the profile (`useOnePublicProfile`) and pass it in.
 */
export function UserAvatar({
	profile,
	className,
}: {
	profile: PublicProfileType
	className?: string
}) {
	return (
		<Avatar className={className}>
			<AvatarImage
				src={avatarUrlify(profile.avatar_path)}
				alt={`${profile.username}'s avatar`}
			/>
			<AvatarFallback seed={profile.uid} className="text-xs font-bold">
				{profile.username.slice(0, 2).toUpperCase()}
			</AvatarFallback>
		</Avatar>
	)
}
