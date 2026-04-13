import { createLazyFileRoute } from '@tanstack/react-router'
import {
	Share,
	Copy,
	Mail,
	MessageSquare,
	Sparkles,
	QrCode,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useProfile } from '@/features/profile/hooks'
import { NativeShareButton } from '@/components/native-share-button'
import CopyLinkButton from '@/components/copy-link-button'
import { copyLink } from '@/lib/utils'

export const Route = createLazyFileRoute('/_user/friends/invite')({
	component: InviteFriendPage,
})

function InviteFriendPage() {
	const { data: profile } = useProfile()
	const signupUrl = `${window.location.origin}/signup?referrer=${profile?.uid}`
	const data = {
		text: `Hello friend, I'm learning a language with Sunlo, a social language learning app. Will you join me? ${signupUrl}`,
		title: `Invitation! Join ${profile?.username || 'your friend'} on Sunlo.app`,
	}
	const share = {
		can: typeof navigator.canShare === 'function' && navigator.canShare(data),
		data,
		url: signupUrl,
		copyUrl: () => copyLink(signupUrl),
	}

	return (
		<main
			className="mx-auto max-w-4xl space-y-12 px-4 py-8 @lg:px-6 @xl:px-8"
			data-testid="invite-friend-page"
		>
			<div className="text-center">
				<div className="bg-1-mlo-primary text-primary mb-6 inline-flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-medium">
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
									<div className="bg-1-mlo-primary group-hover:bg-lc-up-1 flex aspect-square h-12 w-12 items-center justify-center rounded-xl transition-colors">
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
									<div className="bg-1-mlo-accent group-hover:bg-lc-up-1 flex aspect-square h-12 w-12 items-center justify-center rounded-xl transition-colors">
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
									className="border-3-mid-accent bg-1-mlo-accent text-accent-foresoft hover:bg-lc-up-1 w-full"
									variant="soft"
									url={share.url}
								/>
							</CardContent>
						</Card>
					</div>
				:	null
			}

			{/* QR Code */}
			<Card className="border-border/50 shadow-sm" data-testid="invite-qr-card">
				<CardContent className="flex flex-col items-center gap-6 p-8 @lg:flex-row @lg:items-center @lg:gap-8">
					<div
						className="flex aspect-square items-center justify-center rounded-2xl bg-white p-4 shadow"
						data-testid="invite-qr-code"
					>
						<QRCodeSVG
							value={signupUrl}
							size={192}
							level="M"
							marginSize={0}
							aria-label="QR code with invite link"
						/>
					</div>
					<div className="flex-1 space-y-3 text-center @lg:text-start">
						<div className="bg-1-mlo-accent text-accent-foresoft inline-flex items-center space-x-2 rounded-full px-3 py-1 text-sm font-medium">
							<QrCode className="h-4 w-4" />
							<span>Scan to invite</span>
						</div>
						<h2 className="text-foreground text-2xl font-bold">
							Show them in person
						</h2>
						<p className="text-muted-foreground text-pretty">
							Meeting up? Have them point their camera at this QR code to open
							your invite link and join Sunlo.
						</p>
					</div>
				</CardContent>
			</Card>

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
							className="group border-border/50 rounded-xl border p-6 text-left shadow transition-all duration-200 hover:shadow-lg"
						>
							<div className="flex items-center space-x-4">
								<div className="bg-1-mlo-info group-hover:bg-lc-up-1 flex h-12 w-12 items-center justify-center rounded-xl transition-colors">
									<Mail className="text-6-hi-info h-6 w-6" />
								</div>
								<div>
									<h3 className="text-foreground font-semibold">Email</h3>
									<p className="text-muted-foreground text-sm">
										Send via email
									</p>
								</div>
							</div>
						</a>

						{/* WhatsApp */}
						<a
							href={`whatsapp://send?text=${encodeURIComponent(share.data.text)}`}
							className="group border-border/50 rounded-xl border p-6 text-left shadow transition-all duration-200 hover:shadow-lg"
						>
							<div className="flex items-center space-x-4">
								<div className="bg-1-mlo-success group-hover:bg-lc-up-1 flex h-12 w-12 items-center justify-center rounded-xl transition-colors">
									<MessageSquare className="text-6-hi-success h-6 w-6" />
								</div>
								<div>
									<h3 className="text-foreground font-semibold">WhatsApp</h3>
									<p className="text-muted-foreground text-sm">
										Share on WhatsApp
									</p>
								</div>
							</div>
						</a>
						{share.can ? null : (
							<button
								onClick={share.copyUrl}
								className="group border-border/50 col-span-2 rounded-xl border p-6 text-left shadow transition-all duration-200 hover:shadow-lg"
							>
								<div className="flex items-center space-x-3">
									<div className="bg-1-mlo-warning group-hover:bg-lc-up-1 flex aspect-square h-12 w-12 items-center justify-center rounded-xl transition-colors">
										<Copy className="text-6-hi-warning h-6 w-6" />
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
							</button>
						)}
					</div>
				</CardContent>
			</Card>
		</main>
	)
}
