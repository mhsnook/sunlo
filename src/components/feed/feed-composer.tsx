import { useState } from 'react'
import { ListMusic, MessageCircleHeart, MessageSquareQuote } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { Button, buttonVariants } from '@/components/ui/button'
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { AuthenticatedDialogContent } from '@/components/ui/authenticated-dialog'
import { RequestForm } from '@/components/requests/request-form'

export function FeedComposer({ lang }: { lang: string }) {
	const [open, setOpen] = useState(false)

	return (
		<div className="bg-card/50 mb-4 rounded border p-3 shadow-sm">
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<button
						type="button"
						data-testid="feed-composer-trigger"
						className="border-3-mlo-primary hover:border-primary bg-card text-muted-foreground mb-3 flex h-10 w-full rounded-2xl border px-3 py-2 text-start text-sm inset-shadow-sm transition-colors"
					>
						Ask the community for a phrase...
					</button>
				</DialogTrigger>

				<div className="flex flex-wrap gap-1 border-t pt-2">
					<DialogTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							data-testid="feed-composer-request-btn"
						>
							<MessageCircleHeart className="size-4" />
							<span>Request</span>
						</Button>
					</DialogTrigger>
					<Link
						to="/learn/$lang/phrases/new"
						params={{ lang }}
						data-testid="feed-composer-phrase-btn"
						className={buttonVariants({ variant: 'ghost', size: 'sm' })}
					>
						<MessageSquareQuote className="size-4" />
						<span>Phrase</span>
					</Link>
					<Link
						to="/learn/$lang/playlists/new"
						params={{ lang }}
						data-testid="feed-composer-playlist-btn"
						className={buttonVariants({ variant: 'ghost', size: 'sm' })}
					>
						<ListMusic className="size-4" />
						<span>Playlist</span>
					</Link>
				</div>

				<AuthenticatedDialogContent
					data-testid="new-request-dialog"
					authTitle="Post a Request"
					authMessage="You need to sign in to post requests to the public feed."
				>
					<DialogHeader>
						<DialogTitle>Post a Request</DialogTitle>
						<DialogDescription>
							Ask the community for a flashcard recommendation, or to make a new
							one for everyone to learn.
						</DialogDescription>
					</DialogHeader>
					<RequestForm
						lang={lang}
						onSuccess={() => setOpen(false)}
						formTestId="feed-composer-form"
						rows={4}
					/>
				</AuthenticatedDialogContent>
			</Dialog>
		</div>
	)
}
