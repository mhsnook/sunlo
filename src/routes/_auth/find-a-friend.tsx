import { createFileRoute } from '@tanstack/react-router'

import { type SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import toast from 'react-hot-toast'
import supabase from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ProfileWithRelationship } from '@/components/profile-with-relationship'

export const Route = createFileRoute('/_auth/find-a-friend')({
	component: SearchProfilesComponent,
})

const SearchSchema = z.object({
	query: z.string().min(1, 'Search query is required'),
})

type SearchFormData = z.infer<typeof SearchSchema>

const searchProfiles = async (query: string) => {
	const { data } = await supabase
		.from('public_profile')
		.select('uid, username, avatar_url')
		.ilike('username', `%${query}%`)
		.limit(10)
		.throwOnError()

	return data || []
}

export function SearchProfilesComponent() {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<SearchFormData>({
		resolver: zodResolver(SearchSchema),
	})

	const {
		data: searchResults,
		mutate: search,
		isPending: isSearching,
	} = useMutation({
		mutationFn: (data: SearchFormData) => searchProfiles(data.query),
		onError: () => toast.error('Failed to search profiles'),
	})

	return (
		<main className="container mx-auto p-4">
			<h1 className="text-2xl font-bold mb-4">Search Profiles</h1>
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
					<p className="text-red-500 mt-1">{errors.query.message}</p>
				)}
			</form>

			<div className="flex flex-col gap-4">
				{searchResults?.map((profile) => (
					<div key={profile.uid} className="border rounded p-4">
						<ProfileWithRelationship profile={profile} />
					</div>
				))}
			</div>
		</main>
	)
}
