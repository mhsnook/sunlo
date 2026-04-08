import type { AnchorHTMLAttributes } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link } from '@tanstack/react-router'
import { useLiveQuery } from '@tanstack/react-db'
import { eq } from '@tanstack/db'
import { publicProfilesCollection } from '@/features/profile/collections'
import type { uuid } from '@/types/main'
import { Blockquote } from './ui/blockquote'

// Matches `@[uuid]` tokens in stored content
const MENTION_TOKEN_RE =
	/(@)\[([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi

const MENTION_SCHEME = 'mention://'

/**
 * Pre-process content: replace `@[uuid]` with markdown links that use a
 * `mention://` scheme so the custom link renderer can identify them.
 */
function preprocessMentions(content: string): string {
	return content.replace(
		MENTION_TOKEN_RE,
		(_match, _at, uid) => `[@mention](${MENTION_SCHEME}${uid})`
	)
}

/** Tiny inline component that resolves a uid to a username. */
function MentionBadge({ uid }: { uid: uuid }) {
	const { data } = useLiveQuery(
		(q) =>
			q
				.from({ profile: publicProfilesCollection })
				.where(({ profile }) => eq(profile.uid, uid))
				.findOne(),
		[uid]
	)
	const username = data?.username || 'unknown'
	return (
		<Link
			to="/friends/$uid"
			params={{ uid }}
			className="bg-1-mlo-primary text-7-hi-primary hover:bg-2-mlo-primary inline-block rounded-lg px-1 py-0.5 text-sm font-medium no-underline"
		>
			@{username}
		</Link>
	)
}

const components = {
	blockquote: Blockquote,
	a: ({
		href,
		children,
		...props
	}: AnchorHTMLAttributes<HTMLAnchorElement>) => {
		if (href?.startsWith(MENTION_SCHEME)) {
			const uid = href.slice(MENTION_SCHEME.length)
			return <MentionBadge uid={uid} />
		}
		return (
			<a href={href} {...props}>
				{children}
			</a>
		)
	},
}

export function Markdown({
	children,
	...props
}: {
	children: string
	props?: unknown
}) {
	const processed = preprocessMentions(children)
	return (
		<ReactMarkdown skipHtml components={components} {...props}>
			{processed}
		</ReactMarkdown>
	)
}
