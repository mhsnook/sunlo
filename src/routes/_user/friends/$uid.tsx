import { createFileRoute, Link } from '@tanstack/react-router'
import { MessagesSquare, User } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOnePublicProfile } from '@/hooks/use-public-profile'
import { buttonVariants } from '@/components/ui/button-variants'
import { RelationshipActions } from './-relationship-actions'
import { avatarUrlify } from '@/lib/utils'

export const Route = createFileRoute('/_user/friends/$uid')({
	component: ProfilePage,
	loader: ({ context, params }) => {
		const { uid } = params
		const isMine = uid === context.auth.userId
		return { uid, isMine }
	},
})

function ProfilePage() {
	const { uid, isMine } = Route.useLoaderData()
	const { data: profile } = useOnePublicProfile(uid)

	if (!profile)
		throw new Error(
			'Something went wrong loading this profile... please contact administrator'
		)
	return (
		<main className="mx-auto max-w-sm px-2 py-6">
			{isMine ?
				<p className="text-muted-foreground mb-1 text-center italic">
					This is how your profile appears to others
				</p>
			:	null}
			<Card>
				<CardHeader>
					<CardTitle className="mx-auto">
						{profile.username}
						<span className="opacity-70">'s profile</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 text-center">
					<div className="bg-muted-foreground/40 relative mx-auto flex size-32 items-center justify-center rounded-full text-4xl">
						{profile.avatar_path ?
							<img
								src={avatarUrlify(profile.avatar_path)}
								alt={`${profile.username ? `${profile.username}'s` : 'Your'} avatar`}
								className="size-32 rounded-full object-cover"
							/>
						:	<>
								<User className="text-muted-foreground/20 size-32 rounded-full p-1 blur-xs" />
								<span className="absolute top-0 right-0 bottom-0 left-0 flex size-32 items-center justify-center font-bold capitalize">
									{(profile.username ?? '').slice(0, 2)}
								</span>
							</>
						}
					</div>
					<h2 className="text-xl font-semibold">{profile.username}</h2>
					<div>
						<p className="text-muted-foreground mb-2 text-sm capitalize">
							{profile.relation?.status ?? 'unconnected'}
						</p>
						<div className="flex flex-row items-center justify-center gap-2">
							<RelationshipActions uid_for={uid} />
							{profile.relation?.status === 'friends' && (
								<Link
									className={buttonVariants({ variant: 'outline' })}
									to="/friends/chats/$friendUid"
									from={Route.fullPath}
									// oxlint-disable-next-line jsx-no-new-object-as-prop
									params={{ friendUid: profile.uid }}
								>
									<MessagesSquare /> Message
								</Link>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</main>
	)
}
