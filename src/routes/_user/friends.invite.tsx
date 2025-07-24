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

export const Route = createFileRoute('/_user/friends/invite')({
	component: InviteFriendPage,
})

function InviteFriendPage() {
	return (
		<main className="flex flex-col gap-6">
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
		</main>
	)
}

function ShareButtons() {
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
			<div className="flex flex-col gap-2 @md:flex-row">
				<NativeShareButton shareData={shareData} />
				<CopyLinkButton
					url={signupUrl}
					text="Copy link"
					variant="secondary"
					size="lg"
				/>
				<a
					className={buttonVariants({ size: 'lg', variant: 'secondary' })}
					href={`mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodeURIComponent(shareData.text)}`}
				>
					Email <Mail />
				</a>
				<a
					className={buttonVariants({ size: 'lg', variant: 'secondary' })}
					href={`whatsapp://send?text=${encodeURIComponent(shareData.text)}`}
				>
					WhatsApp <Phone className="rounded-full p-px outline" />
				</a>
			</div>
		</div>
	)
}
