import { type ChangeEvent, useCallback } from 'react'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useDebounce, usePrevious } from '@uidotdev/usehooks'
import { Search } from 'lucide-react'

import { PublicProfile } from './-types'
import { Loader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Callout from '@/components/ui/callout'
import { ShowError } from '@/components/errors'
import { Garlic } from '@/components/garlic'
import { Label } from '@/components/ui/label'
import { ProfileWithRelationship } from '@/components/profile-with-relationship'
import { useAuth } from '@/lib/hooks'
import { searchPublicProfilesByUsername } from '@/hooks/use-profile'
import { nullSubmit } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

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
			<SearchProfiles />
		</main>
	)
}

export default function SearchProfiles() {
	const { query } = Route.useSearch()
	const { userId } = useAuth()
	const debouncedQuery = useDebounce(query, 500) ?? ''
	const navigate = useNavigate({ from: Route.fullPath })
	const setQueryInputValue = useCallback(
		(event: ChangeEvent<HTMLInputElement>) =>
			void navigate({
				search: (old) => ({
					...old,
					query: event.target.value || undefined,
				}),
				replace: true,
				params: true,
			}),
		[navigate]
	)

	const {
		data: searchResults,
		error,
		isFetching,
	} = useQuery({
		queryKey: ['public_profile', 'search', debouncedQuery],
		queryFn: async () =>
			searchPublicProfilesByUsername(debouncedQuery, userId!),
		enabled: !!debouncedQuery?.length && !!userId,
	})

	const prevResults = usePrevious(searchResults)
	const resultsToShow =
		!debouncedQuery ? [] : (searchResults ?? prevResults ?? [])
	const showLoader = resultsToShow.length === 0 && isFetching

	return (
		<Card>
			<CardHeader>
				<CardTitle>Search for friends</CardTitle>
				<CardDescription>
					Search to find friends on Sunlo, and connect.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<form className="flex flex-row items-end gap-2" onSubmit={nullSubmit}>
						<div className="w-full">
							<Label>Username</Label>
							<Input
								placeholder="Search by username"
								value={query || ''}
								onChange={setQueryInputValue}
							/>
						</div>
						<Button disabled={isFetching}>
							<Search />
							<span className="hidden @md:block">Search</span>
						</Button>
					</form>
					<Separator className="my-8" />
					{debouncedQuery === undefined ?
						<p className="my-8 italic opacity-60">Search results...</p>
					:	<div className="space-y-2">
							<ShowError>{error?.message}</ShowError>
							{showLoader ?
								<div className="flex h-20 items-center justify-center opacity-50">
									<Loader />
								</div>
							: !(resultsToShow?.length > 0) ?
								<Callout variant="ghost" Icon={BigGarlic}>
									<p>
										No users match that search, but you can invite a friend!
									</p>
								</Callout>
							:	<div className="my-6 space-y-4">
									<p className="text-muted-foreground ms-4 italic">
										{resultsToShow.length} result
										{resultsToShow.length === 1 ? '' : 's'}
									</p>
									{resultsToShow.map((profile: PublicProfile) => (
										<div key={profile.uid} className="rounded p-2 pe-4 shadow">
											<ProfileWithRelationship profile={profile} />
										</div>
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

const BigGarlic = () => (
	<Garlic className="bg-primary-foresoft/20 w-20 rounded-full p-3 @xl:p-4" />
)
