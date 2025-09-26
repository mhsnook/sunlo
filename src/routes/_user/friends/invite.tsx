import { useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Share, Copy, Mail, MessageSquare, Sparkles } from 'lucide-react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useProfile } from '@/hooks/use-profile'
import { NativeShareButton } from '@/components/native-share-button'
import CopyLinkButton, { copyLink } from '@/components/copy-link-button'

export const Route = createFileRoute('/_user/friends/invite')({
	component: InviteFriendPage,
})

function InviteFriendPage() {
	const { data: profile } = useProfile()
	const share = useMemo(() => {
		const signupUrl = `${window.location.origin}/signup?referrer=${profile?.uid}`
		const data = {
			text: `Hello friend, I'm learning a language with Sunlo, a social language learning app. Will you join me? ${signupUrl}`,
			title: `Invitation! Join ${profile?.username || 'your friend'} on Sunlo.app`,
		}
		return {
			can: typeof navigator.canShare === 'function' && navigator.canShare(data),
			data,
			url: signupUrl,
			copyUrl: () => copyLink(signupUrl),
		}
	}, [profile?.username, profile?.uid])

	return (
		<main className="mx-auto max-w-4xl space-y-12 px-4 py-8 @lg:px-6 @xl:px-8">
			<div className="text-center">
				<div className="bg-primary/10 text-primary mb-6 inline-flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-medium">
					<Sparkles className="h-4 w-4" />
					<span>Grow your learning network</span>
				</div>
				<h1 className="text-foreground mb-4 text-4xl font-bold text-balance @lg:text-5xl">
					Invite a Friend to Help
				</h1>
				<p className="text-muted-foreground mx-auto max-w-2xl text-xl text-pretty">
					Or invite someone who's learning the same language as you. Discover,
					create and share useful phrases to build your deck and reach your
					goals.
				</p>
			</div>

			{
				/* Invite Options */
				share.can ?
					<div className="grid grid-cols-1 gap-6 @xl:grid-cols-2">
						{/* Quick Share */}
						<Card className="group border-border/50 transition-all duration-300 hover:shadow-lg">
							<CardContent className="p-8">
								<div className="mb-6 flex items-center space-x-3">
									<div className="bg-primary/10 group-hover:bg-primary/20 flex aspect-square h-12 w-12 items-center justify-center rounded-xl transition-colors">
										<Share className="text-primary h-6 w-6" />
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
								<NativeShareButton className="w-full" shareData={share.data} />
							</CardContent>
						</Card>

						{/* Copy Link */}
						<Card className="group border-border/50 transition-all duration-300 hover:shadow-lg">
							<CardContent className="p-8">
								<div className="mb-6 flex items-center space-x-3">
									<div className="bg-accent/50 group-hover:bg-accent flex aspect-square h-12 w-12 items-center justify-center rounded-xl transition-colors">
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
									url={share.url}
								/>
							</CardContent>
						</Card>
					</div>
				:	null
			}

			{/* Sharing Methods */}
			<Card className="border-border/50 shadow-sm">
				<CardHeader className="my-0 pt-8 pb-0">
					<h2 className="text-foreground text-center text-2xl font-bold">
						Choose Your Method
					</h2>
				</CardHeader>
				<CardContent className="p-8">
					<div className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @xl:grid-cols-2">
						{/* Email */}
						<a
							href={`mailto:?subject=${encodeURIComponent(share.data.title)}&body=${encodeURIComponent(share.data.text)}`}
							className="group border-border/50 rounded-xl border p-6 text-left shadow transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 dark:hover:border-blue-900 dark:hover:bg-blue-950/20"
						>
							<div className="flex items-center space-x-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100/50 transition-colors group-hover:bg-blue-100 dark:bg-blue-900/50 dark:group-hover:bg-blue-900">
									<Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
								</div>
								<div>
									<h3 className="text-foreground font-semibold transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
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
							href={`whatsapp://send?text=${encodeURIComponent(share.data.text)}`}
							className="group border-border/50 rounded-xl border p-6 text-left shadow transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/20"
						>
							<div className="flex items-center space-x-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100/50 transition-colors group-hover:bg-emerald-100 dark:bg-emerald-900/50 dark:group-hover:bg-emerald-900">
									<MessageSquare className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
								</div>
								<div>
									<h3 className="text-foreground font-semibold transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
										WhatsApp
									</h3>
									<p className="text-muted-foreground text-sm">
										Share on WhatsApp
									</p>
								</div>
							</div>
						</a>
						{share.can ? null : (
							<button
								onClick={share.copyUrl}
								className="group border-border/50 col-span-2 rounded-xl border p-6 text-left shadow transition-all duration-200 hover:border-amber-300 hover:bg-amber-50 dark:hover:border-amber-900 dark:hover:bg-amber-950/20"
							>
								<div className="flex items-center space-x-3">
									<div className="flex aspect-square h-12 w-12 items-center justify-center rounded-xl bg-amber-100/50 transition-colors group-hover:bg-amber-100 dark:bg-amber-900/50 dark:group-hover:bg-amber-900">
										<Copy className="h-6 w-6 text-amber-600 dark:text-amber-400" />
									</div>
									<div>
										<h3 className="text-foreground text-lg font-semibold transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
											Copy Link
										</h3>
										<p className="text-muted-foreground text-sm">
											Get a shareable invite link
										</p>
									</div>
								</div>
							</button>
						)}
					</div>
				</CardContent>
			</Card>
		</main>
	)
}
