import {
	useState,
	useRef,
	useCallback,
	useEffect,
	type MutableRefObject,
	type Ref,
	type TextareaHTMLAttributes,
	type ChangeEvent,
	type KeyboardEvent,
} from 'react'
import { ilike } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'
import { publicProfilesCollection } from '@/features/profile/collections'
import type { PublicProfileType } from '@/features/profile/schemas'
import { avatarUrlify } from '@/lib/hooks'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Mention format utilities
// ---------------------------------------------------------------------------

/** Matches `@[uuid]` tokens in stored content */
const MENTION_TOKEN_RE =
	/(@)\[([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi

/**
 * Looks backwards from the cursor to find an in-progress `@query`.
 * Returns null if the cursor isn't inside a mention query.
 */
function extractMentionQuery(
	text: string,
	cursorPos: number
): { query: string; start: number } | null {
	const beforeCursor = text.slice(0, cursorPos)
	// Match @ followed by word chars at end of the string before cursor
	const match = beforeCursor.match(/@(\w*)$/)
	if (!match || match.index === undefined) return null
	return { query: match[1], start: match.index }
}

/** Convert display text (`@username`) → storage text (`@[uuid]`). */
export function serializeMentions(
	text: string,
	mentionMap: Map<string, string>
): string {
	let result = text
	// Sort by length descending so longer usernames are replaced first
	const entries = [...mentionMap.entries()].toSorted(
		(a, b) => b[0].length - a[0].length
	)
	for (const [username, uid] of entries) {
		result = result.replaceAll(`@${username}`, `@[${uid}]`)
	}
	return result
}

/** Convert storage text (`@[uuid]`) → display text (`@username`). */
export function deserializeMentions(
	text: string,
	profilesByUid: Map<string, PublicProfileType>
): { text: string; mentionMap: Map<string, string> } {
	const mentionMap = new Map<string, string>()
	const resolved = text.replace(
		MENTION_TOKEN_RE,
		(_match: string, at: string, uid: string) => {
			const profile = profilesByUid.get(uid)
			if (profile?.username) {
				mentionMap.set(profile.username, uid)
				return `${at}${profile.username}`
			}
			return _match
		}
	)
	return { text: resolved, mentionMap }
}

// ---------------------------------------------------------------------------
// MentionTextarea
// ---------------------------------------------------------------------------

interface MentionTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
	/** Ref to a Map<username, uid> that the parent uses to serialize on submit */
	mentionMapRef: MutableRefObject<Map<string, string>>
}

export function MentionTextarea({
	mentionMapRef,
	onChange,
	value,
	onKeyDown,
	ref: _ref,
	...props
}: MentionTextareaProps & { ref?: Ref<HTMLTextAreaElement> }) {
	const [mentionQuery, setMentionQuery] = useState<{
		query: string
		start: number
	} | null>(null)
	const [selectedIndex, setSelectedIndex] = useState(0)
	const textareaRef = useRef<HTMLTextAreaElement | null>(null)

	// Search profiles when the user is typing a mention query
	const { data: suggestions } = useLiveQuery(
		(q) =>
			mentionQuery && mentionQuery.query.length > 0 ?
				q
					.from({ profile: publicProfilesCollection })
					.where(({ profile }) =>
						ilike(profile.username, `%${mentionQuery.query}%`)
					)
			:	undefined,
		[mentionQuery?.query]
	)

	const filteredSuggestions = (suggestions ?? []).slice(0, 8)
	const showDropdown = mentionQuery !== null && filteredSuggestions.length > 0

	// Reset highlight when results change
	useEffect(() => {
		setSelectedIndex(0)
	}, [mentionQuery?.query])

	const insertMention = useCallback(
		(profile: PublicProfileType) => {
			if (!mentionQuery || !textareaRef.current) return

			const textarea = textareaRef.current
			const currentValue = (value as string) ?? ''
			const before = currentValue.slice(0, mentionQuery.start)
			const after = currentValue.slice(textarea.selectionStart)
			const newValue = `${before}@${profile.username} ${after}`

			mentionMapRef.current.set(profile.username, profile.uid)

			onChange?.({
				target: { value: newValue },
			} as ChangeEvent<HTMLTextAreaElement>)

			setMentionQuery(null)

			const newCursorPos = mentionQuery.start + profile.username.length + 2
			requestAnimationFrame(() => {
				textarea.setSelectionRange(newCursorPos, newCursorPos)
				textarea.focus()
			})
		},
		[mentionQuery, value, onChange, mentionMapRef]
	)

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLTextAreaElement>) => {
			onChange?.(e)
			const cursorPos = e.target.selectionStart
			setMentionQuery(extractMentionQuery(e.target.value, cursorPos))
		},
		[onChange]
	)

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (showDropdown) {
				if (e.key === 'ArrowDown') {
					e.preventDefault()
					setSelectedIndex((i) =>
						Math.min(i + 1, filteredSuggestions.length - 1)
					)
					return
				}
				if (e.key === 'ArrowUp') {
					e.preventDefault()
					setSelectedIndex((i) => Math.max(i - 1, 0))
					return
				}
				if (e.key === 'Enter' || e.key === 'Tab') {
					e.preventDefault()
					insertMention(filteredSuggestions[selectedIndex])
					return
				}
				if (e.key === 'Escape') {
					e.preventDefault()
					setMentionQuery(null)
					return
				}
			}
			onKeyDown?.(e)
		},
		[showDropdown, filteredSuggestions, selectedIndex, insertMention, onKeyDown]
	)

	const wrapperRef = useRef<HTMLDivElement>(null)

	// Capture the textarea element from the DOM
	useEffect(() => {
		textareaRef.current = wrapperRef.current?.querySelector('textarea') ?? null
	})

	return (
		<div className="relative" ref={wrapperRef}>
			<Textarea
				value={value}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				{...props}
			/>
			{showDropdown && (
				<div className="bg-popover border-border absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border shadow-md">
					{filteredSuggestions.map((profile, index) => (
						<button
							key={profile.uid}
							type="button"
							className={cn(
								'flex w-full items-center gap-2 px-3 py-2 text-sm',
								index === selectedIndex ? 'bg-1-mlo-primary' : (
									'hover:bg-muted/50'
								)
							)}
							onMouseDown={(e) => {
								e.preventDefault() // keep textarea focused
								insertMention(profile)
							}}
							onMouseEnter={() => setSelectedIndex(index)}
						>
							<Avatar className="h-6 w-6 shrink-0 rounded-full">
								<AvatarImage
									src={avatarUrlify(profile.avatar_path, 24)}
									alt=""
								/>
								<AvatarFallback className="text-[9px] font-bold">
									{profile.username?.slice(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<span className="truncate font-medium">@{profile.username}</span>
						</button>
					))}
				</div>
			)}
		</div>
	)
}
