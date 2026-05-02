import { createLazyFileRoute } from '@tanstack/react-router'
import { type LucideIcon } from 'lucide-react'
import {
	Archive,
	ArchiveRestore,
	Copy,
	Edit,
	ListMusic,
	MessageCircleHeart,
	MessageSquareQuote,
	MoreVertical,
	NotebookPen,
	Pencil,
	Plus,
	Send,
	Share,
	ThumbsUp,
	Trash2,
	UserCheck,
	UserMinus,
	UserPlus,
} from 'lucide-react'
import { links } from '@/hooks/links'
import { statusStrings } from '@/components/card-pieces/card-status-dropdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const Route = createLazyFileRoute('/microcopy')({
	component: MicrocopyPage,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function IconCell({ Icon }: { Icon?: LucideIcon }) {
	if (!Icon) return <span className="text-muted-foreground text-xs">—</span>
	return <Icon className="size-4" />
}

function SectionHeading({
	title,
	description,
}: {
	title: string
	description: string
}) {
	return (
		<div className="space-y-1">
			<h2 className="text-xl font-bold">{title}</h2>
			<p className="text-muted-foreground text-sm">{description}</p>
		</div>
	)
}

function SourceLink({ file }: { file: string }) {
	return (
		<code className="text-muted-foreground block text-[11px] leading-tight">
			{file}
		</code>
	)
}

// ---------------------------------------------------------------------------
// Section: Navigation Links (live from hooks/links.ts)
// ---------------------------------------------------------------------------

function NavLinksSection() {
	const allLinks = links('tam')
	const globalLinks = links()

	// Show global links first, then language-specific ones
	const globalKeys = Object.keys(globalLinks)
	const langKeys = Object.keys(allLinks).filter((k) => !globalKeys.includes(k))

	return (
		<div className="space-y-4">
			<SectionHeading
				title="Navigation Links"
				description="From hooks/links.ts — each link has a name (short, with-icon) and title (long, standalone)"
			/>
			<p className="text-muted-foreground text-xs">
				Source: <code>src/hooks/links.ts</code>
			</p>

			<div className="space-y-2">
				<h3 className="text-sm font-semibold">Global Links</h3>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-muted-foreground border-b text-left text-xs">
								<th className="p-2">Icon</th>
								<th className="p-2">name (short)</th>
								<th className="p-2">title (long)</th>
								<th className="p-2">Route</th>
							</tr>
						</thead>
						<tbody>
							{globalKeys.map((key) => {
								const l = globalLinks[key]
								return (
									<tr key={key} className="border-b">
										<td className="p-2">
											<IconCell Icon={l.Icon} />
										</td>
										<td className="p-2 font-medium">{l.name}</td>
										<td className="text-muted-foreground p-2">
											{l.title ?? '—'}
										</td>
										<td className="p-2">
											<code className="text-xs">{key}</code>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			</div>

			<div className="space-y-2">
				<h3 className="text-sm font-semibold">
					Language-Specific Links{' '}
					<span className="text-muted-foreground font-normal">
						(showing Tamil)
					</span>
				</h3>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-muted-foreground border-b text-left text-xs">
								<th className="p-2">Icon</th>
								<th className="p-2">name (short)</th>
								<th className="p-2">title (long)</th>
								<th className="p-2">Route</th>
							</tr>
						</thead>
						<tbody>
							{langKeys.map((key) => {
								const l = allLinks[key]
								return (
									<tr key={key} className="border-b">
										<td className="p-2">
											<IconCell Icon={l.Icon} />
										</td>
										<td className="p-2 font-medium">{l.name}</td>
										<td className="text-muted-foreground p-2">
											{l.title ?? '—'}
										</td>
										<td className="p-2">
											<code className="text-xs">{key}</code>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Section: Card Status Actions (live from card-status-dropdown.tsx)
// ---------------------------------------------------------------------------

function CardStatusSection() {
	const keys = Object.keys(statusStrings) as Array<keyof typeof statusStrings>

	return (
		<div className="space-y-4">
			<SectionHeading
				title="Card Status Actions"
				description="From card-status-dropdown.tsx — each status has short/long/action/actionSecond/done labels plus an icon"
			/>
			<p className="text-muted-foreground text-xs">
				Source: <code>src/components/card-pieces/card-status-dropdown.tsx</code>
			</p>

			<div className="grid gap-3 @lg:grid-cols-2 @3xl:grid-cols-3">
				{keys.map((key) => {
					const s = statusStrings[key]
					return (
						<Card key={key}>
							<CardHeader className="pb-2">
								<div className="flex items-center gap-2">
									<span className="[&_svg]:size-5">
										<s.Icon className={s.iconClassName} aria-hidden="true" />
									</span>
									<CardTitle className="text-base">{key}</CardTitle>
								</div>
							</CardHeader>
							<CardContent className="space-y-1 text-sm">
								<div className="grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-0.5">
									<span className="text-muted-foreground text-xs">name</span>
									<span className="font-medium">{s.name}</span>
									<span className="text-muted-foreground text-xs">title</span>
									<span>{s.title}</span>
									<span className="text-muted-foreground text-xs">action</span>
									<span>{s.action}</span>
									<span className="text-muted-foreground text-xs">
										actionSecond
									</span>
									<span className="text-xs">{s.actionSecond}</span>
									<span className="text-muted-foreground text-xs">done</span>
									<span>{s.done}</span>
									<span className="text-muted-foreground text-xs">failed</span>
									<span className="text-xs">{s.failed}</span>
								</div>
							</CardContent>
						</Card>
					)
				})}
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Section: Create Content Actions (reference)
// ---------------------------------------------------------------------------

const createActions = [
	{
		concept: 'Add a phrase',
		contexts: [
			{
				where: 'Nav link name',
				label: 'Phrase',
				Icon: MessageSquareQuote,
				source: 'hooks/links.ts',
			},
			{
				where: 'Nav link title',
				label: 'Add a Phrase',
				Icon: MessageSquareQuote,
				source: 'hooks/links.ts',
			},
			{
				where: 'Plus menu',
				label: 'New Phrase',
				Icon: MessageSquareQuote,
				source: 'components/plus-menu.tsx',
			},
			{
				where: 'Form submit',
				label: 'Save and add another',
				Icon: NotebookPen,
				source: 'routes/_user/learn/$lang.phrases.new.tsx',
			},
			{
				where: 'Stats CTA',
				label: 'Add a phrase',
				Icon: MessageSquareQuote,
				source: 'routes/_user/learn/$lang.stats.tsx',
			},
			{
				where: 'Review done CTA',
				label: 'Add New Phrase',
				Icon: Plus,
				source: 'components/review/when-review-complete-screen.tsx',
			},
		],
	},
	{
		concept: 'Post a request',
		contexts: [
			{
				where: 'Nav link name',
				label: 'Request',
				Icon: MessageCircleHeart,
				source: 'hooks/links.ts',
			},
			{
				where: 'Nav link title',
				label: 'Request a Phrase',
				Icon: MessageCircleHeart,
				source: 'hooks/links.ts',
			},
			{
				where: 'Plus menu',
				label: 'New Request',
				Icon: MessageCircleHeart,
				source: 'components/plus-menu.tsx',
			},
			{
				where: 'Form submit',
				label: 'Post Request',
				source: 'routes/_user/learn/$lang.requests.new.tsx',
			},
			{
				where: 'Feed empty CTA',
				label: 'Post a request for a new phrase',
				source: 'routes/_user/learn/$lang.feed.tsx',
			},
			{
				where: 'Feed empty CTA (alt)',
				label: 'Post a request',
				source: 'routes/_user/learn/$lang.feed.tsx',
			},
			{
				where: 'Stats CTA',
				label: 'Request a phrase',
				Icon: MessageCircleHeart,
				source: 'routes/_user/learn/$lang.stats.tsx',
			},
		],
	},
	{
		concept: 'Create a playlist',
		contexts: [
			{
				where: 'Plus menu',
				label: 'New Playlist',
				Icon: ListMusic,
				source: 'components/plus-menu.tsx',
			},
			{
				where: 'Form submit',
				label: 'Create Playlist',
				source: 'routes/_user/learn/$lang.playlists.new.tsx',
			},
		],
	},
]

function CreateActionsSection() {
	return (
		<div className="space-y-4">
			<SectionHeading
				title="Create Content Actions"
				description="How 'add a phrase', 'post a request', and 'create a playlist' appear across contexts"
			/>
			{createActions.map((action) => (
				<Card key={action.concept}>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">{action.concept}</CardTitle>
					</CardHeader>
					<CardContent>
						<table className="w-full text-sm">
							<thead>
								<tr className="text-muted-foreground border-b text-left text-xs">
									<th className="p-1.5">Context</th>
									<th className="p-1.5">Icon</th>
									<th className="p-1.5">Label</th>
									<th className="p-1.5">Source</th>
								</tr>
							</thead>
							<tbody>
								{action.contexts.map((ctx) => (
									<tr key={ctx.where} className="border-b last:border-0">
										<td className="text-muted-foreground p-1.5 text-xs">
											{ctx.where}
										</td>
										<td className="p-1.5">
											<IconCell Icon={ctx.Icon} />
										</td>
										<td className="p-1.5 font-medium">{ctx.label}</td>
										<td className="p-1.5">
											<SourceLink file={ctx.source} />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</CardContent>
				</Card>
			))}
		</div>
	)
}

// ---------------------------------------------------------------------------
// Section: Share / Send / Copy Actions (reference)
// ---------------------------------------------------------------------------

const shareActions: Array<{
	action: string
	label: string
	Icon: LucideIcon
	ariaLabel?: string
	source: string
}> = [
	{
		action: 'Native share',
		label: 'Share',
		Icon: Share,
		source: 'components/native-share-button.tsx',
	},
	{
		action: 'Share phrase',
		label: 'Share phrase',
		Icon: Share,
		ariaLabel: 'Share phrase',
		source: 'components/card-pieces/share-phrase-button.tsx',
	},
	{
		action: 'Share request',
		label: 'Share request',
		Icon: Share,
		ariaLabel: 'Share request',
		source: 'components/card-pieces/share-request-button.tsx',
	},
	{
		action: 'Share playlist',
		label: 'Share playlist',
		Icon: Share,
		ariaLabel: 'Share playlist',
		source: 'components/playlists/share-playlist-button.tsx',
	},
	{
		action: 'Copy link',
		label: 'Copy Link',
		Icon: Copy,
		ariaLabel: 'Copy link',
		source: 'components/copy-link-button.tsx',
	},
	{
		action: 'Send phrase to friend',
		label: 'Send to {n} friend(s)',
		Icon: Send,
		source: 'components/card-pieces/send-phrase-to-friend.tsx',
	},
	{
		action: 'Send request to friend',
		label: 'Send to {n} friend(s)',
		Icon: Send,
		source: 'components/card-pieces/send-request-to-friend.tsx',
	},
	{
		action: 'Send playlist to friend',
		label: 'Send to {n} friend(s)',
		Icon: Send,
		source: 'components/playlists/send-playlist-to-friend.tsx',
	},
]

function ShareActionsSection() {
	return (
		<div className="space-y-4">
			<SectionHeading
				title="Share / Send / Copy"
				description="Distribution actions — mostly consistent across entities"
			/>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="text-muted-foreground border-b text-left text-xs">
							<th className="p-2">Action</th>
							<th className="p-2">Icon</th>
							<th className="p-2">Label</th>
							<th className="p-2">aria-label</th>
							<th className="p-2">Source</th>
						</tr>
					</thead>
					<tbody>
						{shareActions.map((a) => (
							<tr key={a.source} className="border-b">
								<td className="text-muted-foreground p-2 text-xs">
									{a.action}
								</td>
								<td className="p-2">
									<IconCell Icon={a.Icon} />
								</td>
								<td className="p-2 font-medium">{a.label}</td>
								<td className="p-2 text-xs">{a.ariaLabel ?? '—'}</td>
								<td className="p-2">
									<SourceLink file={a.source} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Section: Edit / Save Actions (reference)
// ---------------------------------------------------------------------------

const editActions: Array<{
	action: string
	triggerIcon: LucideIcon
	submitLabel: string
	source: string
	note?: string
}> = [
	{
		action: 'Edit request',
		triggerIcon: Edit,
		submitLabel: 'Save',
		source: 'components/requests/update-request-dialog.tsx',
	},
	{
		action: 'Edit playlist',
		triggerIcon: Edit,
		submitLabel: 'Save',
		source: 'components/playlists/update-playlist-dialog.tsx',
	},
	{
		action: 'Edit comment',
		triggerIcon: Edit,
		submitLabel: 'Save',
		source: 'components/comments/update-comment-dialog.tsx',
	},
	{
		action: 'Edit translations',
		triggerIcon: Pencil,
		submitLabel: 'Add translation',
		source: 'components/card-pieces/add-translations.tsx',
		note: 'Uses Pencil, not Edit',
	},
	{
		action: 'Edit tags',
		triggerIcon: Pencil,
		submitLabel: 'Save changes',
		source: 'components/card-pieces/add-tags.tsx',
		note: 'Uses Pencil, not Edit',
	},
	{
		action: 'Update profile',
		triggerIcon: Pencil,
		submitLabel: 'Save changes',
		source: 'routes/_user/profile/-update-profile-form.tsx',
	},
	{
		action: 'Getting started profile',
		triggerIcon: Pencil,
		submitLabel: 'Save your profile',
		source: 'routes/_user/getting-started.tsx',
	},
	{
		action: 'Deck settings (goal)',
		triggerIcon: Pencil,
		submitLabel: 'Update your daily goal',
		source: 'routes/_user/learn/$lang.deck-settings.tsx',
	},
	{
		action: 'Deck settings (goal 2)',
		triggerIcon: Pencil,
		submitLabel: 'Update your goal',
		source: 'routes/_user/learn/$lang.deck-settings.tsx',
	},
	{
		action: 'Deck settings (pref)',
		triggerIcon: Pencil,
		submitLabel: 'Save preference',
		source: 'routes/_user/learn/$lang.deck-settings.tsx',
	},
]

function EditActionsSection() {
	return (
		<div className="space-y-4">
			<SectionHeading
				title="Edit / Save Actions"
				description="Trigger icons and submit labels for edit flows — note the inconsistencies"
			/>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="text-muted-foreground border-b text-left text-xs">
							<th className="p-2">Action</th>
							<th className="p-2">Trigger icon</th>
							<th className="p-2">Submit label</th>
							<th className="p-2">Source</th>
							<th className="p-2">Note</th>
						</tr>
					</thead>
					<tbody>
						{editActions.map((a) => (
							<tr key={`${a.action}-${a.source}`} className="border-b">
								<td className="text-muted-foreground p-2 text-xs">
									{a.action}
								</td>
								<td className="p-2">
									<IconCell Icon={a.triggerIcon} />
								</td>
								<td className="p-2 font-medium">{a.submitLabel}</td>
								<td className="p-2">
									<SourceLink file={a.source} />
								</td>
								<td className="p-2">
									{a.note && (
										<Badge variant="outline" className="text-[10px]">
											{a.note}
										</Badge>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Section: Destructive Actions (reference)
// ---------------------------------------------------------------------------

const destructiveActions: Array<{
	action: string
	triggerLabel: string
	triggerIcon: LucideIcon
	confirmLabel: string
	source: string
}> = [
	{
		action: 'Delete request',
		triggerLabel: '(icon only)',
		triggerIcon: Trash2,
		confirmLabel: 'Delete',
		source: 'components/requests/delete-request-dialog.tsx',
	},
	{
		action: 'Delete playlist',
		triggerLabel: '(icon only)',
		triggerIcon: Trash2,
		confirmLabel: 'Delete',
		source: 'components/playlists/delete-playlist-dialog.tsx',
	},
	{
		action: 'Delete comment',
		triggerLabel: '(icon only)',
		triggerIcon: Trash2,
		confirmLabel: 'Delete',
		source: 'components/comments/delete-comment-dialog.tsx',
	},
	{
		action: 'Archive deck',
		triggerLabel: 'Archive deck',
		triggerIcon: Archive,
		confirmLabel: 'Archive',
		source: 'routes/_user/learn/-archive-deck-button.tsx',
	},
	{
		action: 'Restore deck',
		triggerLabel: 'Restore deck',
		triggerIcon: ArchiveRestore,
		confirmLabel: 'Restore',
		source: 'routes/_user/learn/-archive-deck-button.tsx',
	},
	{
		action: 'Unfriend',
		triggerLabel: 'Unfriend',
		triggerIcon: UserMinus,
		confirmLabel: 'Unfriend',
		source: 'routes/_user/friends/-relationship-actions.tsx',
	},
	{
		action: 'Cancel friend request',
		triggerLabel: 'Requested',
		triggerIcon: UserCheck,
		confirmLabel: 'Cancel request',
		source: 'routes/_user/friends/-relationship-actions.tsx',
	},
]

function DestructiveActionsSection() {
	return (
		<div className="space-y-4">
			<SectionHeading
				title="Destructive Actions"
				description="Delete, archive, and remove actions — all use confirmation dialogs"
			/>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="text-muted-foreground border-b text-left text-xs">
							<th className="p-2">Action</th>
							<th className="p-2">Icon</th>
							<th className="p-2">Trigger label</th>
							<th className="p-2">Confirm label</th>
							<th className="p-2">Source</th>
						</tr>
					</thead>
					<tbody>
						{destructiveActions.map((a) => (
							<tr key={a.action} className="border-b">
								<td className="text-muted-foreground p-2 text-xs">
									{a.action}
								</td>
								<td className="p-2">
									<IconCell Icon={a.triggerIcon} />
								</td>
								<td className="p-2">{a.triggerLabel}</td>
								<td className="p-2 font-medium">{a.confirmLabel}</td>
								<td className="p-2">
									<SourceLink file={a.source} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Section: Auth Actions (reference)
// ---------------------------------------------------------------------------

const authActions: Array<{
	context: string
	label: string
	Icon?: LucideIcon
	source: string
	note?: string
}> = [
	{
		context: 'Login form submit',
		label: 'Log in',
		source: 'routes/_auth/login.tsx',
	},
	{
		context: 'Login nav name',
		label: 'Log in',
		source: 'hooks/links.ts',
	},
	{
		context: 'Login nav title',
		label: 'Sign In',
		source: 'hooks/links.ts',
		note: 'Inconsistent with "Log in"',
	},
	{
		context: 'Homepage hero CTA',
		label: 'Sign In',
		source: 'routes/-homepage/hero-section.tsx',
		note: 'Inconsistent with "Log in"',
	},
	{
		context: 'Signup form submit',
		label: 'Sign Up',
		Icon: UserPlus,
		source: 'routes/_auth/signup.tsx',
	},
	{
		context: 'Signup nav name',
		label: 'Sign up',
		source: 'hooks/links.ts',
		note: 'Casing differs from form',
	},
	{
		context: 'Signup nav title',
		label: 'Get Started',
		Icon: UserPlus,
		source: 'hooks/links.ts',
	},
	{
		context: 'Login page CTA',
		label: 'Create account',
		source: 'routes/_auth/login.tsx',
	},
	{
		context: 'Homepage hero CTA',
		label: 'Start Learning',
		Icon: UserPlus,
		source: 'routes/-homepage/hero-section.tsx',
	},
	{
		context: 'Password reset submit',
		label: 'Submit',
		source: 'routes/_auth/forgot-password.tsx',
		note: 'Generic — could be "Reset password"',
	},
	{
		context: 'Email change submit',
		label: 'Submit',
		source: 'routes/_user/profile/change-email.tsx',
		note: 'Generic — could be "Update email"',
	},
]

function AuthActionsSection() {
	return (
		<div className="space-y-4">
			<SectionHeading
				title="Auth Actions"
				description="Login, signup, and auth-related labels — the most inconsistent area"
			/>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="text-muted-foreground border-b text-left text-xs">
							<th className="p-2">Context</th>
							<th className="p-2">Icon</th>
							<th className="p-2">Label</th>
							<th className="p-2">Source</th>
							<th className="p-2">Flag</th>
						</tr>
					</thead>
					<tbody>
						{authActions.map((a) => (
							<tr key={`${a.context}-${a.label}`} className="border-b">
								<td className="text-muted-foreground p-2 text-xs">
									{a.context}
								</td>
								<td className="p-2">
									<IconCell Icon={a.Icon} />
								</td>
								<td className="p-2 font-medium">{a.label}</td>
								<td className="p-2">
									<SourceLink file={a.source} />
								</td>
								<td className="p-2">
									{a.note && (
										<Badge variant="outline" className="text-[10px]">
											{a.note}
										</Badge>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Section: Friend Actions (reference)
// ---------------------------------------------------------------------------

const friendActions: Array<{
	state: string
	buttonLabel: string
	Icon: LucideIcon
	toastMessage: string
	source: string
}> = [
	{
		state: 'Unconnected',
		buttonLabel: 'Add friend',
		Icon: ThumbsUp,
		toastMessage: 'Friend request sent',
		source: '-relationship-actions.tsx / use-friends.ts',
	},
	{
		state: 'Friends',
		buttonLabel: 'Friends → Unfriend',
		Icon: UserCheck,
		toastMessage: 'You are no longer friends',
		source: '-relationship-actions.tsx / use-friends.ts',
	},
	{
		state: 'Pending (received)',
		buttonLabel: 'Confirm friends',
		Icon: ThumbsUp,
		toastMessage: 'Friend request accepted',
		source: '-relationship-actions.tsx / _user.tsx',
	},
	{
		state: 'Pending (received, decline)',
		buttonLabel: '(X icon) → Confirm',
		Icon: ThumbsUp,
		toastMessage: 'Declined this invitation',
		source: '-relationship-actions.tsx / use-friends.ts',
	},
	{
		state: 'Pending (sent)',
		buttonLabel: 'Requested → Cancel request',
		Icon: UserCheck,
		toastMessage: 'Cancelled this invitation',
		source: '-relationship-actions.tsx / use-friends.ts',
	},
]

function FriendActionsSection() {
	return (
		<div className="space-y-4">
			<SectionHeading
				title="Friend / Relationship Actions"
				description="Button states, confirmation flows, and toast messages for friend interactions"
			/>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="text-muted-foreground border-b text-left text-xs">
							<th className="p-2">State</th>
							<th className="p-2">Icon</th>
							<th className="p-2">Button label</th>
							<th className="p-2">Toast on success</th>
							<th className="p-2">Source</th>
						</tr>
					</thead>
					<tbody>
						{friendActions.map((a) => (
							<tr key={a.state} className="border-b">
								<td className="text-muted-foreground p-2 text-xs">{a.state}</td>
								<td className="p-2">
									<IconCell Icon={a.Icon} />
								</td>
								<td className="p-2 font-medium">{a.buttonLabel}</td>
								<td className="p-2 text-xs">{a.toastMessage}</td>
								<td className="p-2">
									<SourceLink file={a.source} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Section: Language CTA Button (AppNav) — state machine
// ---------------------------------------------------------------------------

const langCtaStates: Array<{
	state: string
	condition: string
	buttonLabel: string
	action: string
	dialogTitle?: string
	dialogOptions?: string
	testId: string
}> = [
	{
		state: 'Unauthenticated',
		condition: '!isAuth',
		buttonLabel: 'Join',
		action: 'Link → /signup',
		testId: 'join-to-learn-link',
	},
	{
		state: 'No deck',
		condition: 'isAuth && !deck',
		buttonLabel: 'Learn {Language}',
		action: 'Mutation: insert user_deck',
		dialogTitle: "You're learning {Language}!",
		dialogOptions:
			'"Do My First Review" → /review  |  "Keep Browsing" → dismiss',
		testId: 'start-learning-button',
	},
	{
		state: 'Archived deck',
		condition: 'isAuth && deck.archived',
		buttonLabel: 'Continue Learning',
		action: 'Opens unarchive dialog',
		dialogTitle: 'Un-archive your {Language} deck?',
		dialogOptions:
			'"Yes, restore" (mutation)  |  "No, keep archived" → dismiss',
		testId: 'continue-learning-button',
	},
	{
		state: 'Active deck',
		condition: 'isAuth && deck && !deck.archived',
		buttonLabel: '(hidden)',
		action: 'Returns null',
		testId: '—',
	},
]

function LangCtaSection() {
	return (
		<div className="space-y-4">
			<SectionHeading
				title="Language CTA Button (AppNav)"
				description="Appears between the tab links and the ⋮ menu on all /learn/$lang/* pages. State depends on auth + deck status."
			/>
			<p className="text-muted-foreground text-xs">
				Source: <code>src/components/navs/-start-learning-button.tsx</code>
			</p>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="text-muted-foreground border-b text-left text-xs">
							<th className="p-2">State</th>
							<th className="p-2">Condition</th>
							<th className="p-2">Button label</th>
							<th className="p-2">Action</th>
							<th className="p-2">Dialog title</th>
							<th className="p-2">Dialog options</th>
							<th className="p-2">data-testid</th>
						</tr>
					</thead>
					<tbody>
						{langCtaStates.map((s) => (
							<tr key={s.state} className="border-b">
								<td className="p-2 text-xs font-medium">{s.state}</td>
								<td className="p-2">
									<code className="text-xs">{s.condition}</code>
								</td>
								<td className="p-2 font-medium">{s.buttonLabel}</td>
								<td className="text-muted-foreground p-2 text-xs">
									{s.action}
								</td>
								<td className="p-2 text-xs">{s.dialogTitle ?? '—'}</td>
								<td className="p-2 text-xs">{s.dialogOptions ?? '—'}</td>
								<td className="p-2">
									<code className="text-xs">{s.testId}</code>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Section: Icon-only Buttons & Aria Labels (reference)
// ---------------------------------------------------------------------------

const iconOnlyButtons: Array<{
	action: string
	Icon?: LucideIcon
	ariaLabel: string
	source: string
	duplicated?: boolean
}> = [
	{
		action: 'Play phrase audio',
		ariaLabel: 'Play phrase',
		source: 'components/review/review-single-card.tsx',
	},
	{
		action: 'Play translation audio',
		ariaLabel: 'Play translation',
		source: 'components/review/review-single-card.tsx',
	},
	{
		action: 'Open context menu',
		Icon: MoreVertical,
		ariaLabel: 'Open context menu',
		source: 'components/review/review-single-card.tsx',
	},
	{
		action: 'More options (comment)',
		Icon: MoreVertical,
		ariaLabel: 'More options',
		source: 'components/comments/comment-context-menu.tsx',
	},
	{
		action: 'Upvote request',
		Icon: ThumbsUp,
		ariaLabel: '"Vote up" / "Remove vote"',
		source: 'components/requests/upvote-request-button.tsx',
	},
	{
		action: 'Upvote playlist',
		Icon: ThumbsUp,
		ariaLabel: '"Vote up this playlist" / "Remove vote"',
		source: 'components/playlists/upvote-playlist-button.tsx',
	},
	{
		action: 'Move phrase up',
		ariaLabel: 'Move phrase up',
		source: 'manage-playlist-phrases-dialog + playlists.new',
		duplicated: true,
	},
	{
		action: 'Move phrase down',
		ariaLabel: 'Move phrase down',
		source: 'manage-playlist-phrases-dialog + playlists.new',
		duplicated: true,
	},
	{
		action: 'Remove phrase',
		Icon: Trash2,
		ariaLabel: 'Remove phrase',
		source: 'manage-playlist-phrases-dialog + playlists.new + bulk-add',
		duplicated: true,
	},
	{
		action: 'Delete request',
		Icon: Trash2,
		ariaLabel: 'Delete request',
		source: 'components/requests/delete-request-dialog.tsx',
	},
	{
		action: 'Delete playlist',
		Icon: Trash2,
		ariaLabel: 'Delete playlist',
		source: 'components/playlists/delete-playlist-dialog.tsx',
	},
	{
		action: 'Delete comment',
		Icon: Trash2,
		ariaLabel: 'Delete comment',
		source: 'components/comments/delete-comment-dialog.tsx',
	},
	{
		action: 'Toggle card in deck',
		ariaLabel: '"Learn this phrase" / "Skip this phrase"',
		source: 'components/card-pieces/card-status-dropdown.tsx',
	},
	{
		action: 'Add a comment',
		ariaLabel: 'Add a comment',
		source: 'components/requests/request-buttons-row.tsx',
	},
	{
		action: 'Add a reply',
		ariaLabel: 'Add a reply',
		source: 'components/comments/comment-with-replies.tsx',
	},
	{
		action: 'Send to friend',
		Icon: Send,
		ariaLabel: 'Send this request to a friend',
		source: 'components/requests/request-buttons-row.tsx',
	},
	{
		action: 'Edit tags',
		Icon: Pencil,
		ariaLabel: 'Edit tags',
		source: 'components/card-pieces/add-tags.tsx',
	},
	{
		action: 'Update request (trigger)',
		Icon: Edit,
		ariaLabel: '(none)',
		source: 'components/requests/update-request-dialog.tsx',
	},
	{
		action: 'Manage phrases',
		Icon: ListMusic,
		ariaLabel: 'Manage phrases',
		source: 'components/playlists/manage-playlist-phrases-dialog.tsx',
	},
	{
		action: 'Filter feed',
		ariaLabel: 'Filter feed content',
		source: 'components/feed/feed-filter-menu.tsx',
	},
]

function AriaLabelsSection() {
	return (
		<div className="space-y-4">
			<SectionHeading
				title="Icon-Only Buttons & Accessibility"
				description="Aria labels for icon-only interactive elements — check for missing or inconsistent labels"
			/>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="text-muted-foreground border-b text-left text-xs">
							<th className="p-2">Action</th>
							<th className="p-2">aria-label</th>
							<th className="p-2">Source</th>
							<th className="p-2">Flag</th>
						</tr>
					</thead>
					<tbody>
						{iconOnlyButtons.map((a) => (
							<tr key={`${a.action}-${a.source}`} className="border-b">
								<td className="text-muted-foreground p-2 text-xs">
									{a.action}
								</td>
								<td className="p-2 font-medium">{a.ariaLabel}</td>
								<td className="p-2">
									<SourceLink file={a.source} />
								</td>
								<td className="p-2">
									{a.duplicated && (
										<Badge variant="outline" className="text-[10px]">
											Duplicated
										</Badge>
									)}
									{a.ariaLabel === '(none)' && (
										<Badge
											variant="outline"
											className="border-destructive text-destructive text-[10px]"
										>
											Missing
										</Badge>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Section: Inconsistencies Summary
// ---------------------------------------------------------------------------

const inconsistencies: Array<{
	issue: string
	examples: string
	recommendation: string
	priority: 'high' | 'medium' | 'low'
}> = [
	{
		issue: '"Log in" vs "Sign In" vs "Login"',
		examples: 'links.ts name vs title, hero CTA',
		recommendation: 'Pick "Log in" everywhere',
		priority: 'high',
	},
	{
		issue: '"Ignore card" vs "Skip" vs "Skipped"',
		examples: 'statusStrings.skipped.action, review card context menu',
		recommendation: 'Use "Skip" / "Skip this phrase"',
		priority: 'high',
	},
	{
		issue: 'Feed and Playlists share the Logs icon',
		examples:
			'links.ts: both /learn/$lang/feed and /learn/$lang/playlists use Logs',
		recommendation: 'Use ListMusic for playlists',
		priority: 'high',
	},
	{
		issue: 'Edit vs Pencil icon imports',
		examples:
			'update-request/playlist/comment use Edit; add-tags/translations use Pencil',
		recommendation: 'Both render identically, standardize on Pencil',
		priority: 'medium',
	},
	{
		issue: 'Save button text varies widely',
		examples:
			'"Save" / "Save changes" / "Save your profile" / "Save preference" / "Update your daily goal"',
		recommendation: 'Use "Save" (short) or "Save changes" (forms)',
		priority: 'medium',
	},
	{
		issue: 'Create-content verbs inconsistent',
		examples:
			'"Add a Phrase" / "New Phrase" / "Add New Phrase" / "Save and add another"',
		recommendation:
			'Nav: "Add a phrase", Plus menu: "New phrase", Submit: "Save phrase"',
		priority: 'medium',
	},
	{
		issue: 'Upvote uses title= vs aria-label=',
		examples: 'request/comment upvotes use title; playlist uses aria-label',
		recommendation: 'Standardize on aria-label for all',
		priority: 'low',
	},
	{
		issue: 'Error toast prefix varies',
		examples:
			'"Something went wrong" / "An error has occurred" / "There was an error..." / "Failed to..."',
		recommendation: 'Standardize on "Failed to {action}"',
		priority: 'low',
	},
	{
		issue: 'Success toast exclamation marks inconsistent',
		examples: '"Tags added!" vs "Request deleted" vs "Playlist updated!"',
		recommendation: 'Drop exclamation marks from all success toasts',
		priority: 'low',
	},
]

function InconsistenciesSection() {
	return (
		<div className="space-y-4">
			<SectionHeading
				title="Inconsistencies & Recommendations"
				description="Flagged issues from the microcopy audit, prioritized"
			/>
			<div className="space-y-2">
				{inconsistencies.map((issue) => (
					<Card key={issue.issue}>
						<CardContent className="flex items-start gap-3 p-3">
							<Badge
								variant={
									issue.priority === 'high'
										? 'destructive'
										: issue.priority === 'medium'
											? 'secondary'
											: 'outline'
								}
								className="mt-0.5 shrink-0"
							>
								{issue.priority}
							</Badge>
							<div className="min-w-0">
								<p className="text-sm font-medium">{issue.issue}</p>
								<p className="text-muted-foreground text-xs">
									{issue.examples}
								</p>
								<p className="mt-1 text-xs">
									<span className="font-medium">Recommendation:</span>{' '}
									{issue.recommendation}
								</p>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function MicrocopyPage() {
	return (
		<div className="@container mx-auto max-w-5xl space-y-10 p-4 pb-20">
			<div>
				<h1 className="text-3xl font-bold">Microcopy Inventory</h1>
				<p className="text-muted-foreground text-sm">
					All user-facing action labels, button text, and icons in one place.
					Sections marked &ldquo;live&rdquo; import data from source. Reference
					sections document what exists and where.
				</p>
			</div>

			<div className="flex flex-wrap gap-2">
				<Button variant="soft" size="sm" asChild>
					<a href="#nav-links">Nav Links</a>
				</Button>
				<Button variant="soft" size="sm" asChild>
					<a href="#card-status">Card Status</a>
				</Button>
				<Button variant="soft" size="sm" asChild>
					<a href="#create">Create Content</a>
				</Button>
				<Button variant="soft" size="sm" asChild>
					<a href="#share">Share / Send</a>
				</Button>
				<Button variant="soft" size="sm" asChild>
					<a href="#edit">Edit / Save</a>
				</Button>
				<Button variant="soft" size="sm" asChild>
					<a href="#destructive">Destructive</a>
				</Button>
				<Button variant="soft" size="sm" asChild>
					<a href="#auth">Auth</a>
				</Button>
				<Button variant="soft" size="sm" asChild>
					<a href="#friends">Friends</a>
				</Button>
				<Button variant="soft" size="sm" asChild>
					<a href="#lang-cta">Language CTA</a>
				</Button>
				<Button variant="soft" size="sm" asChild>
					<a href="#a11y">Accessibility</a>
				</Button>
				<Button variant="soft" size="sm" asChild>
					<a href="#issues">Issues</a>
				</Button>
			</div>

			<section id="nav-links">
				<NavLinksSection />
			</section>

			<hr />

			<section id="card-status">
				<CardStatusSection />
			</section>

			<hr />

			<section id="create">
				<CreateActionsSection />
			</section>

			<hr />

			<section id="share">
				<ShareActionsSection />
			</section>

			<hr />

			<section id="edit">
				<EditActionsSection />
			</section>

			<hr />

			<section id="destructive">
				<DestructiveActionsSection />
			</section>

			<hr />

			<section id="auth">
				<AuthActionsSection />
			</section>

			<hr />

			<section id="friends">
				<FriendActionsSection />
			</section>

			<hr />

			<section id="lang-cta">
				<LangCtaSection />
			</section>

			<hr />

			<section id="a11y">
				<AriaLabelsSection />
			</section>

			<hr />

			<section id="issues">
				<InconsistenciesSection />
			</section>
		</div>
	)
}
