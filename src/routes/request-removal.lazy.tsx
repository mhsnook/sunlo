import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/request-removal')({
	component: RequestRemovalPage,
})

function RequestRemovalPage() {
	return (
		<main className="bg-lum-1 text-lum-9 px-2 py-6 @md:px-[5%]">
			<Card className="prose dark:prose-invert">
				<CardHeader>
					<CardTitle>Request Removal</CardTitle>
					<CardDescription>
						Request the removal of your data from the Sunlo database.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p>
						Please email us at <code>sunloapp</code>@<code>gmail</code>.
						<code>com</code> from your registered email with the subject line{' '}
						<code>REQUEST REMOVAL</code>. (This app has only ~2 users right now,
						and 0 removal requests, so we will just delete your data by hand and
						let you know when it's done.)
					</p>
					<p>We will delete your account and all associated data.</p>
					<ul>
						<li>Your user profile and public profile</li>
						<li>Your login account, email and password</li>
						<li>
							Your user avatar image and any images you ever uploaded as an
							avatar
						</li>
						<li>Your friend requests, invites, or friend connections</li>
						<li>Your flashcards statuses, review records, and deck settings</li>
					</ul>
					<p>
						We will not delete your contributions to the public library, such as
						phrases and translations.
					</p>
				</CardContent>
			</Card>
		</main>
	)
}
