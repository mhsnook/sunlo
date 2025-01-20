import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { type SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import toast from 'react-hot-toast'
import supabase from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PublicProfile } from '@/types/main'

export const Route = createFileRoute('/_auth/find-a-friend')({
	component: () => {
		return (
			<main>
				<SearchProfilesComponent />
			</main>
		)
	},
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
	const queryClient = useQueryClient()

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

	const addFriend = async (friendId: string) => {
		const {
			data: { user },
		} = await supabase.auth.getUser()
		if (!user) throw new Error('User not authenticated')

		const { error } = await supabase
			.from('friendships')
			.insert({ user_id: user.id, friend_id: friendId, status: 'pending' })

		if (error) throw error
	}

	const { mutate: sendFriendRequest, isPending: isSendingRequest } =
		useMutation({
			mutationFn: addFriend,
			onSuccess: () => {
				toast.success('Friend request sent successfully')
				void queryClient.invalidateQueries({ queryKey: ['friendships'] })
			},
			onError: (error) => {
				toast.error('Failed to send friend request')
				console.log(`Error:`, error)
			},
		})

	return (
		<div className="container mx-auto p-4">
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

			<div className="grid gap-4 @3xl:grid-cols-2 @5xl:grid-cols-3">
				{searchResults?.map((profile) => (
					<Card key={profile.uid} className="text-center">
						<CardHeader>
							<CardTitle>{profile.username}</CardTitle>
						</CardHeader>
						<CardContent>
							<img
								src={profile.avatar_url}
								alt={`${profile.username}'s avatar`}
							/>
							<Button
								onClick={() => sendFriendRequest(profile.uid)}
								disabled={isSendingRequest}
							>
								{isSendingRequest ? 'Sending Request...' : 'Add as Friend'}
							</Button>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	)
}
