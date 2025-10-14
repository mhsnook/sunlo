import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { useRelations } from '@/hooks/use-friends'
import { Loader } from '@/components/ui/loader'
import { uuid } from '@/types/main'
import { Checkbox } from '@/components/ui/checkbox'
import { User } from 'lucide-react'
import { useAvatarUrl } from '@/lib/hooks'
import { PublicProfile } from '@/routes/_user/friends/-types'

export function SelectMultipleFriends({
	uids = [],
	setUids,
}: {
	uids: uuid[]
	setUids: Dispatch<SetStateAction<uuid[]>>
}) {
	const { data: relations, isPending } = useRelations()
	const handleClick = useCallback(
		(uid: uuid) =>
			setUids((prev: uuid[]) => {
				if (prev.includes(uid)) return prev.filter((id) => id !== uid)
				return [...prev, uid]
			}),
		[setUids]
	)
	if (isPending) return <Loader />
	if (!relations?.uids.friends.length)
		return <p className="text-muted-foreground">No friends found (oops)</p>

	const friends = relations.uids.friends.map(
		(uid) => relations.relationsMap[uid]
	)

	return (
		<div className="mb-4 space-y-2">
			{friends
				.filter((f) => f.profile !== undefined)
				.map((f) => (
					<FriendLabelCheckbox
						key={f.profile.uid}
						handleClick={handleClick}
						profile={f.profile}
						isSelected={uids.includes(f.profile.uid)}
					/>
				))}
		</div>
	)
}

function FriendLabelCheckbox({
	profile,
	isSelected,
	handleClick,
}: {
	profile: PublicProfile
	isSelected: boolean
	handleClick: (uid: uuid) => void
}) {
	const avatarUrl = useAvatarUrl(profile.avatar_path)
	return (
		<label
			className={`${isSelected ? 'bg-primary/10 outline-primary-foresoft/30 outline' : ''} flex items-center justify-between gap-2 rounded-2xl px-3 py-2 transition-all`}
		>
			<div className="flex flex-row items-center gap-2">
				{avatarUrl ?
					<img
						src={avatarUrl}
						alt={`${profile.username}'s avatar`}
						className="size-8 rounded-full object-cover"
					/>
				:	<User className="bg-foreground/20 size-8 rounded-full p-1" />}
				<span>{profile.username}</span>
			</div>
			<Checkbox
				// oxlint-disable-next-line jsx-no-new-function-as-prop
				checked={isSelected}
				// oxlint-disable-next-line jsx-no-new-function-as-prop
				onClick={() => handleClick(profile.uid)}
			/>
		</label>
	)
}
