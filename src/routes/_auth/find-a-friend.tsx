import { createFileRoute } from '@tanstack/react-router'

import { type SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ProfileWithRelationship } from '@/components/profile-with-relationship'
import { useAuth } from '@/lib/hooks'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { searchPublicProfilesByUsername } from '@/lib/use-profile'

export const Route = createFileRoute('/_auth/find-a-friend')({
	component: SearchProfilesComponent,
})

const SearchSchema = z.object({
	query: z.string().min(1, 'Search query is required'),
})

type SearchFormData = z.infer<typeof SearchSchema>

export function SearchProfilesComponent() {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<SearchFormData>({
		resolver: zodResolver(SearchSchema),
	})
	const { userId } = useAuth()
	const {
		data: searchResults,
		mutate: search,
		isPending: isSearching,
	} = useMutation({
		mutationFn: (data: SearchFormData) =>
			searchPublicProfilesByUsername(data.query, userId!),
		onError: () => toast.error('Failed to search profiles'),
	})

	return (
		<Card className="mx-auto mt-[10cqh] w-full max-w-md [padding:clamp(0.5rem,2cqw,2rem)]">
			<CardHeader>
				<CardTitle>Find a Friend on Sunlo</CardTitle>
				<CardDescription>
					Note: This page does not work. please come back later.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					noValidate
					// eslint-disable-next-line @typescript-eslint/no-misused-promises
					onSubmit={handleSubmit(search as SubmitHandler<SearchFormData>)}
					className="mb-6"
				>
					<div className="flex gap-2">
						<Input
							{...register('query')}
							placeholder="Search by username"
							className={cn({ 'border-red-500': errors.query })}
						/>
						<Button type="submit" disabled={isSearching}>
							{isSearching ? 'Searching...' : 'Search'}
						</Button>
					</div>
					{errors.query && (
						<p className="mt-1 text-red-500">{errors.query.message}</p>
					)}
				</form>

				<div className="flex flex-col gap-4">
					{searchResults?.map((profile) => (
						<div key={profile.uid} className="rounded border p-4">
							<ProfileWithRelationship profile={profile} />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
