import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { useRelations } from '@/lib/friends'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_user/friends/chats')({
	component: ChatsLayout,
})

function ChatsLayout() {
	const { data: relations } = useRelations()

	if (!relations) {
		return <div>Loading friends...</div>
	}

	const friends = relations.uids.friends.map(
		(uid) => relations.relationsMap[uid]
	)

	// Mock sorting by recent activity
	const sortedFriends = friends.sort((a, b) =>
		a.most_recent_created_at == b.most_recent_created_at ? 0
		: a.most_recent_created_at < b.most_recent_created_at ? 1
		: -1
	)

	return (
		<div className="grid h-[calc(100vh-10rem)] grid-cols-1 gap-4 @md:grid-cols-[300px_1fr]">
			<Card>
				<CardHeader>
					<CardTitle>Chats</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<ScrollArea className="h-[calc(100vh-15rem)]">
						<div className="flex flex-col gap-1 p-2">
							{sortedFriends.length === 0 ?
								<p className="text-muted-foreground p-4 text-sm">
									You have no friends to chat with yet.
								</p>
							:	sortedFriends.map((friend) => (
									<Link
										key={friend.uidOther}
										to="/friends/chats/$friendId"
										params={{ friendId: friend.uidOther }}
										className={cn(
											'text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 transition-all'
										)}
										activeProps={{
											className: 'bg-accent text-accent-foreground',
										}}
									>
										<Avatar className="h-8 w-8">
											<AvatarImage
												src={friend.profile?.avatarUrl}
												alt={friend.profile?.username}
											/>
											<AvatarFallback>
												{friend.profile?.username?.charAt(0).toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 truncate">
											<div className="font-semibold">
												{friend.profile?.username}
											</div>
											<p className="text-muted-foreground truncate text-xs">
												Mock message...
											</p>
										</div>
									</Link>
								))
							}
						</div>
					</ScrollArea>
				</CardContent>
			</Card>
			<div className="flex h-full flex-col">
				<Outlet />
			</div>
		</div>
	)
}
