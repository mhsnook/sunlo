import { useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Share2, Copy, Mail, MessageSquare, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useProfile } from '@/hooks/use-profile'
import { NativeShareButton } from '@/components/native-share-button'
import CopyLinkButton from '@/components/copy-link-button'

export const Route = createFileRoute('/_user/friends/invite')({
	component: InviteFriendPage,
})

function InviteFriendPage() {
	const { data: profile } = useProfile()
	const signupUrl = `${window.location.origin}/signup?referrer=${profile?.uid}`
	const shareData = useMemo(
		() => ({
			text: `Hello friend, I'm learning a language with Sunlo, a social language learning app. Will you join me? ${signupUrl}`,
			title: `Invitation! Join ${profile?.username || 'your friend'} on Sunlo.app`,
		}),
		[profile?.username, signupUrl]
	)
	return (
		<main className="mx-auto max-w-4xl px-4 py-12 @lg:px-6 @xl:px-8">
			<div className="mb-12 text-center">
				<div className="bg-primary/10 text-primary mb-6 inline-flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-medium">
					<Sparkles className="h-4 w-4" />
					<span>Grow your learning network</span>
				</div>
				<h1 className="text-foreground mb-4 text-4xl font-bold text-balance @lg:text-5xl">
					Invite a Friend to Help
				</h1>
				<p className="text-muted-foreground mx-auto max-w-2xl text-xl text-pretty">
					Or someone who's learning the same language as you. Share knowledge,
					learn together, and achieve your goals faster with collaborative
					learning
				</p>
			</div>

			{/* Invite Options */}
			<div className="mb-12 grid grid-cols-1 gap-6 @xl:grid-cols-2">
				{/* Quick Share */}
				<Card className="group border-border/50 transition-all duration-300 hover:shadow-lg">
					<CardContent className="p-8">
						<div className="mb-6 flex items-center space-x-3">
							<div className="bg-primary/10 group-hover:bg-primary/20 flex h-12 w-12 items-center justify-center rounded-xl transition-colors">
								<Share2 className="text-primary h-6 w-6" />
							</div>
							<div>
								<h3 className="text-foreground text-lg font-semibold">
									Quick Share
								</h3>
								<p className="text-muted-foreground text-sm">
									Share instantly with one tap
								</p>
							</div>
						</div>
						<NativeShareButton className="w-full" shareData={shareData} />
					</CardContent>
				</Card>

				{/* Copy Link */}
				<Card className="group border-border/50 transition-all duration-300 hover:shadow-lg">
					<CardContent className="p-8">
						<div className="mb-6 flex items-center space-x-3">
							<div className="bg-accent/50 group-hover:bg-accent flex h-12 w-12 items-center justify-center rounded-xl transition-colors">
								<Copy className="text-accent-foreground h-6 w-6" />
							</div>
							<div>
								<h3 className="text-foreground text-lg font-semibold">
									Copy Link
								</h3>
								<p className="text-muted-foreground text-sm">
									Get a shareable invite link
								</p>
							</div>
						</div>
						<CopyLinkButton
							size="lg"
							className="w-full"
							variant="outline-accent"
							url={`${window.location.host}/signup?referrer=${profile?.uid}`}
						/>
					</CardContent>
				</Card>
			</div>

			{/* Sharing Methods */}
			<Card className="border-border/50 shadow-sm">
				<CardContent className="p-8">
					<div className="mb-8 text-center">
						<h2 className="text-foreground mb-2 text-2xl font-bold">
							Choose Your Method
						</h2>
						<p className="text-muted-foreground">
							Pick the best way to reach your friends
						</p>
					</div>

					<div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
						{/* Email */}
						<a
							href={`mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodeURIComponent(shareData.text)}`}
							className="group border-border/50 hover:border-primary/30 hover:bg-primary/5 rounded-xl border p-6 text-left transition-all duration-200"
						>
							<div className="flex items-center space-x-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 transition-colors group-hover:bg-blue-100 dark:bg-blue-950/50 dark:group-hover:bg-blue-900/50">
									<Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
								</div>
								<div>
									<h3 className="text-foreground group-hover:text-primary font-semibold transition-colors">
										Email
									</h3>
									<p className="text-muted-foreground text-sm">
										Send via email
									</p>
								</div>
							</div>
						</a>

						{/* WhatsApp */}
						<a
							href={`whatsapp://send?text=${encodeURIComponent(shareData.text)}`}
							className="group border-border/50 rounded-xl border p-6 text-left transition-all duration-200 hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-950/20"
						>
							<div className="flex items-center space-x-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 transition-colors group-hover:bg-green-100 dark:bg-green-950/50 dark:group-hover:bg-green-900/50">
									<MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
								</div>
								<div>
									<h3 className="text-foreground font-semibold transition-colors group-hover:text-green-600 dark:group-hover:text-green-400">
										WhatsApp
									</h3>
									<p className="text-muted-foreground text-sm">
										Share on WhatsApp
									</p>
								</div>
							</div>
						</a>
					</div>
				</CardContent>
			</Card>
		</main>
	)
}
