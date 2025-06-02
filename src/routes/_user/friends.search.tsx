import {
	createFileRoute,
	Link,
	Outlet,
	useNavigate,
} from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { useDebounce, usePrevious } from '@uidotdev/usehooks'
import { Contact, Search } from 'lucide-react'
import { Loader } from '@/components/ui/loader'

import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Callout from '@/components/ui/callout'

import { useRelations } from '@/lib/friends'
import type { PublicProfile, uuid } from '@/types/main'
import supabase from '@/lib/supabase-client'
import { ShowError } from '@/components/errors'
import { Garlic } from '@/components/garlic'
import { Label } from '@/components/ui/label'
import { ProfileWithRelationship } from '@/components/profile-with-relationship'
import { useAuth } from '@/lib/hooks'

const SearchSchema = z.object({
	query: z.string().optional(),
	lang: z.string().optional(),
})

export const Route = createFileRoute('/_user/friends/search')({
	component: FriendRequestPage,
	validateSearch: SearchSchema,
})

function FriendRequestPage() {
	return (
		<main className="flex flex-col gap-4">
			<Outlet />
			<PendingInvitationsSection />
			<SearchProfiles />
		</main>
	)
}

function PendingInvitationsSection() {
	const { data, isPending, error } = useRelations()

	return !(data?.uids.invitations?.length > 0) ?
			<p
				className={`text-muted-foreground mx-2 ${isPending ? 'invisible' : ''}`}
			>
				No friend requests pending for you.
			</p>
		:	<Card>
				<CardHeader>
					<CardTitle>
						<div className="flex flex-row items-center justify-between">
							<span>Invitations to connect</span>
							<Link
								to="/friends"
								aria-disabled="true"
								className={buttonVariants({
									size: 'badge',
									variant: 'outline',
								})}
							>
								<Contact className="size-3" />{' '}
								<span className="me-1">Friends list</span>
							</Link>
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{isPending ?
						<Loader />
					: error ?
						<ShowError>{error.message}</ShowError>
					:	data?.uids.invitations.map((uid) => (
							<ProfileWithRelationship
								key={uid}
								profile={data?.relationsMap[uid].profile}
							/>
						))
					}
				</CardContent>
			</Card>
}

const searchAsync = async (
	query: string,
	uid: uuid
): Promise<PublicProfile[] | null> => {
	if (!query) return null
	const { data } = await supabase
		.from('public_profile')
		.select('uid, username, avatar_url')
		.ilike('username', `%${query}%`)
		.neq('uid', uid)
		.limit(10)
		.throwOnError()
	return data || []
}

export default function SearchProfiles() {
	const { query } = Route.useSearch()
	const { userId } = useAuth()
	const debouncedQuery = useDebounce(query, 500)
	const navigate = useNavigate({ from: Route.fullPath })
	const setQueryInputValue = (val: string) =>
		navigate({
			search: (old) => ({
				...old,
				query: val ? val : undefined,
			}),
			replace: true,
			params: true,
		})

	const {
		data: searchResults,
		error,
		isFetching,
	} = useQuery({
		queryKey: ['public_profile', 'search', debouncedQuery as string],
		queryFn: async ({ queryKey }) => searchAsync(queryKey[2]!, userId!),
		enabled: !!debouncedQuery?.length && !!userId,
	})

	const prevResults = usePrevious(searchResults)
	const resultsToShow =
		!debouncedQuery ? [] : (searchResults ?? prevResults ?? [])
	const showLoader = resultsToShow.length === 0 && isFetching ? true : false

	return (
		<Card className="min-h-[21rem]">
			<CardHeader>
				<CardTitle>Search for friends</CardTitle>
				<CardDescription>
					Search to find friends on Sunlo, and connect.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<form
						className="flex flex-row items-end gap-2"
						onSubmit={(e) => {
							e.preventDefault()
							e.stopPropagation()
						}}
					>
						<div className="w-full">
							<Label>Username</Label>
							<Input
								placeholder="Search by username"
								value={query || ''}
								onChange={(event) => {
									void setQueryInputValue(event.target.value)
								}}
								autoFocus
							/>
						</div>
						<Button disabled={isFetching}>
							<Search />
							<span className="hidden @md:block">Search</span>
						</Button>
					</form>

					{debouncedQuery === undefined ?
						<p className="py-[1.75rem] italic opacity-60">Search results...</p>
					:	<div className="space-y-2">
							<ShowError>{error?.message}</ShowError>
							{showLoader ?
								<div className="flex h-20 items-center justify-center opacity-50">
									<Loader />
								</div>
							: !(resultsToShow?.length > 0) ?
								<Callout variant="ghost" Icon={() => <Garlic size={32} />}>
									<p>No users match that search.</p>
									<p>
										<Link
											className={buttonVariants({ variant: 'outline' })}
											to="/friends/invite"
											from={Route.fullPath}
										>
											Invite a friend to Sunlo
										</Link>
									</p>
								</Callout>
							:	<div className="my-6 space-y-2">
									{resultsToShow.map((profile) => (
										<ProfileWithRelationship
											key={profile.uid}
											profile={profile}
										/>
									))}
								</div>
							}
						</div>
					}
				</div>
			</CardContent>
		</Card>
	)
}
