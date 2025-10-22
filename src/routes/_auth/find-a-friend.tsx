import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProfileWithRelationship } from '@/components/profile-with-relationship'
import { useAuth } from '@/lib/hooks'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { useSearchProfilesByUsername } from '@/hooks/use-public-profile'
import { useState } from 'react'
import { useDebounce } from '@uidotdev/usehooks'

export const Route = createFileRoute('/_auth/find-a-friend')({
	component: SearchProfilesComponent,
})

function SearchProfilesComponent() {
	const [rawQuery, setQuery] = useState('')
	const query = useDebounce(rawQuery, 100)
	const { userId } = useAuth()
	const { data: searchResults, isLoading } = useSearchProfilesByUsername(query)

	return (
		<Card className="mx-auto mt-[10cqh] w-full max-w-md [padding:clamp(0.5rem,2cqw,2rem)]">
			<CardHeader>
				<CardTitle>Find a Friend on Sunlo</CardTitle>
				<CardDescription>
					Note: This page does not work. please come back later.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="mb-6">
					<div className="flex gap-2">
						<Input
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search by username"
						/>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? 'Loading profiles...' : 'Search'}
						</Button>
					</div>
				</form>

				<div className="flex flex-col gap-4">
					{searchResults?.map((profile) =>
						profile.uid === userId ?
							null
						:	<div key={profile.uid} className="rounded border p-4">
								<ProfileWithRelationship uid={profile.uid} />
							</div>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
