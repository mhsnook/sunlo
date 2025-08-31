import { useRelations } from '@/lib/friends'
import { Loader } from '../ui/loader'
import { uuid } from '@/types/main'
import { Checkbox } from '../ui/checkbox'
import { User } from 'lucide-react'
import { Dispatch, SetStateAction } from 'react'

export function SelectMultipleFriends({
	uids = [],
	setUids,
}: {
	uids: uuid[]
	setUids: Dispatch<SetStateAction<uuid[]>>
}) {
	const { data: relations, isPending } = useRelations()

	if (isPending) return <Loader />
	if (!relations?.uids.friends.length)
		return <p className="text-muted-foreground">No friends found (oops)</p>

	const friends = relations.uids.friends.map(
		(uid) => relations.relationsMap[uid]
	)

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
						key={f.profile.uid}
						className={`${uids.includes(f.profile.uid) ? 'bg-primary/10 outline-primary-foresoft/30 outline' : ''} flex items-center justify-between gap-2 rounded-2xl px-3 py-2 transition-all`}
					>
						<div className="flex flex-row items-center gap-2">
							{f.profile.avatarUrl ?
								<img
									src={f.profile.avatarUrl}
									alt={`${f.profile.username}'s avatar`}
									className="size-8 rounded-full object-cover"
								/>
							:	<User className="bg-foreground/20 size-8 rounded-full p-1" />}
							<span>{f.profile.username}</span>
						</div>
						<Checkbox
							checked={uids.includes(f.profile.uid)}
							onClick={() => handleClick(f.profile.uid)}
						/>
					</label>
				))}
		</div>
	)
}
