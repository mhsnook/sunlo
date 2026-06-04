import {
	type Dispatch,
	type ReactElement,
	type ReactNode,
	type RefObject,
	type SetStateAction,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Link } from '@tanstack/react-router'
import { Check, Quote, Search, Send, UserPlus, Users, X } from 'lucide-react'

import { useAllChats, useRelationFriends } from '@/features/social/hooks'
import type { RelationsFullType } from '@/features/social/live'
import type { PhraseFullFilteredType } from '@/features/phrases/schemas'
import { useAuth } from '@/lib/use-auth'
import { useIsMobile } from '@/hooks/use-mobile'
import { agoShort } from '@/lib/dayjs'
import { cn } from '@/lib/utils'
import type { uuid } from '@/types/main'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { LoginSignupButtons } from '@/components/ui/authenticated-dialog'
import { IconSizedLoader, Loader } from '@/components/ui/loader'

const EMPTY_UIDS: uuid[] = []

/* ──────────────────────────────────────────────────────────
   Sorting — most-recent-activity first, no-history at bottom
   ────────────────────────────────────────────────────────── */
function sortByRecency(friends: RelationsFullType[]): RelationsFullType[] {
	// ISO timestamps compare lexicographically === chronologically.
	// Empty/null timestamps sort to the bottom of the descending list.
	return [...friends].toSorted((a, b) =>
		(b.most_recent_created_at ?? '').localeCompare(
			a.most_recent_created_at ?? ''
		)
	)
}

/* ──────────────────────────────────────────────────────────
   Highlight the matched substring of a username
   ────────────────────────────────────────────────────────── */
function highlight(text: string, query: string): ReactNode {
	if (!query) return text
	const i = text.toLowerCase().indexOf(query.toLowerCase())
	if (i < 0) return text
	return (
		<>
			{text.slice(0, i)}
			<mark className="bg-2-mid-warning text-8-hi-warning rounded-[3px] px-px">
				{text.slice(i, i + query.length)}
			</mark>
			{text.slice(i + query.length)}
		</>
	)
}

/* ──────────────────────────────────────────────────────────
   A single selectable friend row
   ────────────────────────────────────────────────────────── */
function FriendRow({
	friend,
	query,
	selected,
	onToggle,
}: {
	friend: RelationsFullType
	query: string
	selected: boolean
	onToggle: (uid: uuid) => void
}) {
	const { profile } = friend
	const timestamp = agoShort(friend.most_recent_created_at)
	return (
		<button
			type="button"
			aria-pressed={selected}
			data-testid="friend-row"
			data-key={friend.uid}
			onClick={() => onToggle(friend.uid)}
			className={cn(
				'group hover:bg-0-mlo-primary flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-start outline -outline-offset-1 outline-transparent transition-colors',
				selected && 'bg-1-mlo-primary outline-primary-foresoft/40'
			)}
		>
			<UserAvatar profile={profile} className="size-10" />
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate font-bold">
					{highlight(profile.username, query)}
				</span>
			</span>
			<span className="flex shrink-0 flex-col items-end gap-1">
				{friend.status === 'pending' ? (
					<span className="bg-2-mid-primary text-7-hi-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
						<UserPlus className="size-2.5" /> Pending
					</span>
				) : timestamp ? (
					<span className="text-muted-foreground text-xs">{timestamp}</span>
				) : null}
			</span>
			<span
				aria-hidden="true"
				className={cn(
					'flex size-[22px] shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors',
					selected
						? 'bg-primary border-primary text-primary-foreground'
						: 'border-border bg-card group-hover:border-primary-foresoft'
				)}
			>
				<Check
					className={cn('size-3.5', selected ? 'opacity-100' : 'opacity-0')}
				/>
			</span>
		</button>
	)
}

/* ──────────────────────────────────────────────────────────
   Context preview chip — what you're about to send
   ────────────────────────────────────────────────────────── */
export function SharePreviewChip({
	icon = <Quote className="size-4.5" />,
	title,
	subtitle,
}: {
	icon?: ReactNode
	title: ReactNode
	subtitle?: ReactNode
}) {
	return (
		<div className="bg-0-mlo-primary border-2-mlo-primary border-l-primary mx-3.5 flex items-center gap-2.5 rounded-lg border border-l-4 px-3 py-2.5">
			<span className="text-6-hi-accent flex shrink-0">{icon}</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate font-bold">{title}</span>
				{subtitle ? (
					<span className="text-muted-foreground block truncate text-sm italic">
						{subtitle}
					</span>
				) : null}
			</span>
		</div>
	)
}

/** Build a phrase preview chip from a full phrase object. */
export function PhrasePreviewChip({
	phrase,
}: {
	phrase: PhraseFullFilteredType
}) {
	const gloss =
		phrase.translations_mine[0]?.text ?? phrase.translations_other[0]?.text
	return <SharePreviewChip title={phrase.text} subtitle={gloss} />
}

/* ──────────────────────────────────────────────────────────
   The picker body — preview + search + list + footer.
   Shared verbatim between the desktop dialog and mobile sheet.
   ────────────────────────────────────────────────────────── */
function PickerBody({
	friendsOverride,
	preview,
	uids,
	setUids,
	search,
	setSearch,
	searchRef,
	onSend,
	isPending,
}: {
	friendsOverride?: RelationsFullType[]
	preview?: ReactNode
	uids: uuid[]
	setUids: Dispatch<SetStateAction<uuid[]>>
	search: string
	setSearch: Dispatch<SetStateAction<string>>
	searchRef: RefObject<HTMLInputElement | null>
	onSend: (uids: uuid[]) => void
	isPending: boolean
}) {
	// These live queries run only while the picker is open (PickerBody is
	// portal-mounted by the dialog), so closed pickers on list items cost
	// nothing. A static override (the /themes showcase) skips them entirely.
	const liveFriends = useRelationFriends()
	const { isReady: chatsReady } = useAllChats()
	const friends = friendsOverride ?? liveFriends.data
	const isLoading = friendsOverride ? false : !!liveFriends.isLoading
	const isReady = friendsOverride ? true : !!chatsReady

	const query = search.trim()

	const sorted = useMemo(() => sortByRecency(friends ?? []), [friends])
	const filtered = useMemo(() => {
		if (!query) return sorted
		const needle = query.toLowerCase()
		return sorted.filter((f) =>
			f.profile.username.toLowerCase().includes(needle)
		)
	}, [query, sorted])

	const toggle = (uid: uuid) =>
		setUids((prev) =>
			prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
		)

	const count = uids.length

	if (isLoading)
		return (
			<div className="py-10">
				<Loader />
			</div>
		)

	// No friends at all — friendly empty state
	if (!friends?.length)
		return (
			<div className="flex flex-col">
				{preview ? <div className="pt-1">{preview}</div> : null}
				<div className="text-muted-foreground px-6 py-9 text-center">
					<span className="bg-2-mlo-primary text-6-hi-primary mb-3.5 inline-flex size-14 items-center justify-center rounded-full">
						<Users className="size-7" />
					</span>
					<h3 className="text-foreground mb-1.5 text-base font-bold">
						No friends yet
					</h3>
					<p className="mx-auto mb-4 max-w-xs text-sm leading-relaxed">
						Invite a friend to start sending each other phrases, requests, and
						playlists.
					</p>
					<Link
						to="/friends"
						className={cn(buttonVariants({ variant: 'default' }), 'gap-2')}
					>
						<UserPlus className="size-4" /> Invite a friend
					</Link>
				</div>
			</div>
		)

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			{preview ? <div className="pt-1">{preview}</div> : null}

			{/* Sticky search */}
			<div className="bg-popover sticky top-0 z-5 border-b px-3.5 pt-3 pb-2.5">
				<div className="bg-0-lo-neutral focus-within:bg-card focus-within:border-ring focus-within:ring-ring/25 flex items-center gap-2.5 rounded-2xl border px-3 py-2 transition focus-within:ring-2">
					<Search className="text-muted-foreground size-4 shrink-0" />
					<input
						ref={searchRef}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search by username…"
						aria-label="Search friends"
						data-testid="friend-search"
						className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 border-0 bg-transparent outline-hidden"
					/>
					{query ? (
						<button
							type="button"
							onClick={() => setSearch('')}
							aria-label="Clear search"
							className="text-muted-foreground hover:text-foreground flex p-0.5"
						>
							<X className="size-3.5" />
						</button>
					) : null}
				</div>
			</div>

			{/* Scrollable list */}
			<div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
				{filtered.length === 0 ? (
					<div className="text-muted-foreground px-4 py-8 text-center text-sm">
						<div>
							No friend named{' '}
							<span className="text-foreground font-bold">“{query}”</span>
						</div>
						<Link
							to="/friends"
							className={cn(
								buttonVariants({ variant: 'soft', size: 'sm' }),
								'mt-3.5 gap-2'
							)}
						>
							<UserPlus className="size-3.5" /> Invite to Sunlo
						</Link>
					</div>
				) : (
					<div className="flex flex-col gap-px">
						{filtered.map((f) => (
							<FriendRow
								key={f.uid}
								friend={f}
								query={query}
								selected={uids.includes(f.uid)}
								onToggle={toggle}
							/>
						))}
					</div>
				)}
			</div>

			{/* Sticky footer with confirm CTA */}
			<div className="bg-popover flex items-center gap-3 border-t px-3.5 py-3">
				<span className="text-muted-foreground text-sm">
					{count > 0 ? (
						<>
							<strong className="text-foreground font-bold">{count}</strong>{' '}
							selected
						</>
					) : (
						'Pick one or more friends'
					)}
				</span>
				<Button
					className="ms-auto gap-2"
					disabled={count === 0 || !isReady || isPending}
					onClick={() => onSend(uids)}
					data-testid="send-to-friends-button"
				>
					{isPending ? <IconSizedLoader /> : <Send className="size-4" />}
					<span className="whitespace-nowrap">
						{count > 0 ? `Send to ${count}` : 'Send'}
					</span>
				</Button>
			</div>
		</div>
	)
}

/* ──────────────────────────────────────────────────────────
   Not-logged-in prompt (shown inside the same shell)
   ────────────────────────────────────────────────────────── */
function AuthPrompt({ title, message }: { title: string; message: string }) {
	return (
		<div className="flex flex-col gap-4 p-6">
			<div>
				<h2 className="text-lg leading-none font-semibold tracking-tight">
					{title}
				</h2>
				<p className="text-muted-foreground mt-2 text-sm">{message}</p>
			</div>
			<LoginSignupButtons />
		</div>
	)
}

/* ──────────────────────────────────────────────────────────
   Responsive shell — centered dialog (desktop) / bottom sheet
   (mobile). Controlled open state; keeps its own selection
   and search, reset whenever it closes.
   ────────────────────────────────────────────────────────── */
export function SelectFriendsToShareDialog({
	open,
	onOpenChange,
	title = 'Send to friends',
	description,
	preview,
	onSend,
	isPending = false,
	authTitle = 'Login to Send',
	authMessage = 'You need to be logged in to send things to friends.',
	trigger,
	friends: friendsOverride,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	title?: string
	description?: string
	preview?: ReactNode
	onSend: (uids: uuid[]) => void
	isPending?: boolean
	authTitle?: string
	authMessage?: string
	trigger?: ReactNode
	/** Provide a static friends list (e.g. the /themes showcase) instead of
	 *  pulling from the user's live collections. */
	friends?: RelationsFullType[]
}) {
	const { isAuth } = useAuth()
	const isMobile = useIsMobile()
	// A static override (the /themes showcase) always renders the picker;
	// otherwise gate on auth.
	const showPicker = friendsOverride ? true : isAuth
	const [uids, setUids] = useState<uuid[]>(EMPTY_UIDS)
	const [search, setSearch] = useState('')
	const searchRef = useRef<HTMLInputElement>(null)

	// Reset selection + search every time the picker closes
	useEffect(() => {
		if (!open) {
			setUids(EMPTY_UIDS)
			setSearch('')
		}
	}, [open])

	const popupClassName = cn(
		'bg-popover fixed z-50 flex flex-col overflow-hidden border shadow-lg',
		'data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0',
		isMobile
			? 'inset-x-0 bottom-0 max-h-[92vh] rounded-t-[1.375rem] border-t data-[closed]:slide-out-to-bottom data-[open]:slide-in-from-bottom'
			: 'top-1/2 left-1/2 max-h-[85vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded data-[closed]:zoom-out-95 data-[open]:zoom-in-95'
	)

	return (
		<DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
			{trigger ? (
				<DialogPrimitive.Trigger
					render={trigger as ReactElement}
					data-slot="share-picker-trigger"
				/>
			) : null}
			<DialogPrimitive.Portal>
				<DialogPrimitive.Backdrop className="data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 fixed inset-0 z-40 bg-black/50 backdrop-blur-xs" />
				<DialogPrimitive.Popup
					className={popupClassName}
					initialFocus={showPicker ? searchRef : undefined}
					aria-label={title}
					data-testid="friend-picker"
				>
					{showPicker ? (
						<>
							{isMobile ? (
								<div className="bg-3-mlo-neutral mx-auto mt-2 h-1 w-9 rounded-full" />
							) : null}
							<div className="flex items-center gap-3 px-4.5 pt-3.5 pb-2">
								<DialogPrimitive.Title className="text-base font-bold tracking-tight">
									{title}
								</DialogPrimitive.Title>
								{description ? (
									<DialogPrimitive.Description className="sr-only">
										{description}
									</DialogPrimitive.Description>
								) : null}
								<DialogPrimitive.Close
									aria-label="Close"
									data-testid="close-friend-picker"
									className="bg-2-lo-neutral hover:bg-3-lo-neutral text-foreground ms-auto flex size-8 items-center justify-center rounded-md transition-colors"
								>
									<X className="size-4" />
								</DialogPrimitive.Close>
							</div>
							<PickerBody
								friendsOverride={friendsOverride}
								preview={preview}
								uids={uids}
								setUids={setUids}
								search={search}
								setSearch={setSearch}
								searchRef={searchRef}
								onSend={onSend}
								isPending={isPending}
							/>
						</>
					) : (
						<AuthPrompt title={authTitle} message={authMessage} />
					)}
				</DialogPrimitive.Popup>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	)
}
