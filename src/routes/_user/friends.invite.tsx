import { createFileRoute } from '@tanstack/react-router'

import { Mail, Phone } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { useProfile } from '@/lib/use-profile'
import { NativeShareButton } from '@/components/native-share-button'
import CopyLinkButton from '@/components/copy-link-button'
import { useMemo } from 'react'
import { PendingInvitationsSection } from '@/components/friends/pending-invites'

export const Route = createFileRoute('/_user/friends/invite')({
	component: InviteFriendPage,
})

function InviteFriendPage() {
	return (
		<div className="space-y-4">
			<PendingInvitationsSection />
			<Card>
				<CardHeader>
					<CardTitle>Invite a Friend</CardTitle>
					<CardDescription>
						Invite a friend to learn with you or to help you learn.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ShareButtons />
				</CardContent>
			</Card>
		</div>
	)
}

export function ShareButtons({ size = 'lg' }: { size?: string }) {
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
		<div>
			<div className="flex flex-col flex-wrap gap-2 @xl:flex-row">
				<NativeShareButton shareData={shareData} />
				<CopyLinkButton
					url={signupUrl}
					text="Copy link"
					variant="secondary"
					size={size}
					collapse={false}
				/>
				<a
					className={buttonVariants({ size, variant: 'secondary' })}
					href={`mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodeURIComponent(shareData.text)}`}
				>
					<Mail />
					Email
				</a>
				<a
					className={buttonVariants({ size, variant: 'secondary' })}
					href={`whatsapp://send?text=${encodeURIComponent(shareData.text)}`}
				>
					<Phone className="rounded-full p-px outline" />
					WhatsApp
				</a>
			</div>
		</div>
	)
}
