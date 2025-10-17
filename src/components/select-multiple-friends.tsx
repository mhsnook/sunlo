import type { Dispatch, SetStateAction } from 'react'
import { useRelationFriends } from '@/hooks/use-friends'
import { Loader } from '@/components/ui/loader'
import { uuid } from '@/types/main'
import { Checkbox } from '@/components/ui/checkbox'
import { User } from 'lucide-react'
import { avatarUrlify } from '@/lib/utils'

export function SelectMultipleFriends({
	uids = [],
	setUids,
}: {
	uids: uuid[]
	setUids: Dispatch<SetStateAction<uuid[]>>
}) {
	const { data: friends, isLoading } = useRelationFriends()

	if (isLoading) return <Loader />
	if (!friends.length)
		return <p className="text-muted-foreground">No friends found (oops)</p>

	const handleClick = (uid: uuid) =>
		setUids((prev: uuid[]) => {
			if (prev.includes(uid)) return prev.filter((id) => id !== uid)
			return [...prev, uid]
		})

	return (
		<div className="mb-4 space-y-2">
			{friends
				.filter((f) => f.profile !== undefined)
				.map((f) => (
					<label
						key={f.uid}
						className={`${uids.includes(f.uid) ? 'bg-primary/10 outline-primary-foresoft/30 outline' : ''} flex items-center justify-between gap-2 rounded-2xl px-3 py-2 transition-all`}
					>
						<div className="flex flex-row items-center gap-2">
							{f.profile.avatar_path ?
								<img
									src={avatarUrlify(f.profile.avatar_path)}
									alt={`${f.profile.username}'s avatar`}
									className="size-8 rounded-full object-cover"
								/>
							:	<User className="bg-foreground/20 size-8 rounded-full p-1" />}
							<span>{f.profile.username}</span>
						</div>
						<Checkbox
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							checked={uids.includes(f.uid)}
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onClick={() => handleClick(f.uid)}
						/>
					</label>
				))}
		</div>
	)
}
