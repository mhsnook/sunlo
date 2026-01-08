import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import supabase from '@/lib/supabase-client'
import { Loader } from '@/components/ui/loader'
import { Users, Activity, BookOpen, MessageSquare } from 'lucide-react'
import { ElementType } from 'react'

export const Route = createFileRoute('/_user/admin/dashboard')({
	beforeLoad: async ({ context }) => {
		// Check if user is an admin
		if (!context.auth.isAuth || !context.auth.userId) {
			throw redirect({ to: '/login' })
		}

		const { data: isAdmin, error } = await supabase.rpc('is_admin')

		if (error || !isAdmin) {
			throw redirect({ to: '/' })
		}

		return {
			titleBar: {
				title: 'Admin Dashboard',
				subtitle: 'System analytics and monitoring',
			},
		}
	},
	component: AdminDashboard,
})

interface SummaryStats {
	total_users: number
	active_decks: number
	reviews_week: number
	reviews_yesterday: number
	total_requests: number
	total_playlists: number
	total_phrases: number
}

interface ReviewStats {
	review_date: string
	total_reviews: number
	unique_users: number
	unique_review_sessions: number
}

interface DeckStats {
	creation_date: string
	lang: string
	decks_created: number
}

function AdminDashboard() {
	const { data: summaryStats, isLoading: loadingSummary } = useQuery({
		queryKey: ['admin', 'summary-stats'],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('admin_summary_stats')
				.select('*')
				.single()

			if (error) throw error
			return data as SummaryStats
		},
	})

	const { data: reviewStats, isLoading: loadingReviews } = useQuery({
		queryKey: ['admin', 'review-stats'],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('admin_review_stats')
				.select('*')
				.limit(7)

			if (error) throw error
			return data as ReviewStats[]
		},
	})

	const { data: deckStats, isLoading: loadingDecks } = useQuery({
		queryKey: ['admin', 'deck-stats'],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('admin_deck_stats')
				.select('*')
				.limit(10)

			if (error) throw error
			return data as DeckStats[]
		},
	})

	if (loadingSummary) {
		return <Loader />
	}

	return (
		<div className="space-y-6 p-6">
			<div>
				<h1 className="text-3xl font-bold">Admin Dashboard</h1>
				<p className="text-muted-foreground">
					System analytics and activity monitoring
				</p>
			</div>

			{/* Summary Stats Cards */}
			{summaryStats && (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<StatsCard
						title="Total Users"
						value={summaryStats.total_users}
						icon={Users}
						description={`${summaryStats.total_phrases} phrases created`}
					/>
					<StatsCard
						title="Active Decks"
						value={summaryStats.active_decks}
						icon={BookOpen}
						description={`${summaryStats.reviews_week} reviews this week`}
					/>
					<StatsCard
						title="Social Activity"
						value={summaryStats.total_requests + summaryStats.total_playlists}
						icon={MessageSquare}
						description={`${summaryStats.total_requests} requests, ${summaryStats.total_playlists} playlists`}
					/>
					<StatsCard
						title="Recent Reviews"
						value={summaryStats.reviews_yesterday}
						icon={Activity}
						description="Reviews yesterday"
					/>
				</div>
			)}

			{/* Review Activity */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Activity className="h-5 w-5" />
						Review Activity (Last 30 Days)
					</CardTitle>
				</CardHeader>
				<CardContent>
					{loadingReviews ?
						<Loader />
					: reviewStats && reviewStats.length > 0 ?
						<div className="space-y-2">
							{reviewStats.slice(0, 10).map((day) => (
								<div
									key={day.review_date}
									className="flex items-center justify-between"
								>
									<span className="text-sm">
										{new Date(day.review_date).toLocaleDateString()}
									</span>
									<div className="flex gap-2">
										<Badge variant="secondary">
											{day.total_reviews} reviews
										</Badge>
										<Badge variant="outline">{day.unique_users} users</Badge>
										<Badge variant="outline">
											{day.unique_review_sessions} sessions
										</Badge>
									</div>
								</div>
							))}
						</div>
					:	<p className="text-muted-foreground">No review data available</p>}
				</CardContent>
			</Card>

			{/* Deck Creation Stats */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BookOpen className="h-5 w-5" />
						Recent Deck Creation (Last 30 Days)
					</CardTitle>
				</CardHeader>
				<CardContent>
					{loadingDecks ?
						<Loader />
					: deckStats && deckStats.length > 0 ?
						<div className="space-y-2">
							{deckStats.map((stat, idx) => (
								<div
									key={`${stat.creation_date}-${stat.lang}-${idx}`}
									className="flex items-center justify-between"
								>
									<div className="flex items-center gap-2">
										<span className="text-sm">
											{new Date(stat.creation_date).toLocaleDateString()}
										</span>
										<Badge variant="outline">{stat.lang.toUpperCase()}</Badge>
									</div>
									<Badge variant="secondary">
										{stat.decks_created} deck{stat.decks_created > 1 ? 's' : ''}
									</Badge>
								</div>
							))}
						</div>
					:	<p className="text-muted-foreground">No deck creation data</p>}
				</CardContent>
			</Card>
		</div>
	)
}

interface StatsCardProps {
	title: string
	value: string | number
	icon: ElementType
	description?: string
}

function StatsCard({ title, value, icon: Icon, description }: StatsCardProps) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
				<Icon className="text-muted-foreground h-4 w-4" />
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				{description && (
					<p className="text-muted-foreground text-xs">{description}</p>
				)}
			</CardContent>
		</Card>
	)
}
