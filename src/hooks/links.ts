import { useParams } from '@tanstack/react-router'
import { useUnreadChatsCount } from '@/features/social/hooks'
import { useActiveReviewRemaining } from '@/features/review/hooks'
import { useUnreadCount } from '@/features/notifications/hooks'
import { todayString } from '@/lib/utils'

import { LinkType } from '@/types/main'
import {
	BarChart3,
	Bell,
	ChartBarDecreasing,
	CircleStar,
	Compass,
	FileText,
	HeartHandshake,
	HeartPlus,
	Home,
	HouseHeart,
	Lock,
	LogIn,
	ListPlus,
	Logs,
	Mail,
	TableProperties,
	MessageCircleHeart,
	MessageSquareQuote,
	MessagesSquare,
	Newspaper,
	Rocket,
	Search,
	Settings,
	Share,
	UserPen,
	UserPlus,
} from 'lucide-react'
import languages, { LangKey } from '@/lib/languages'

export const links = (lang?: LangKey): Record<string, LinkType> => {
	const constantLinks = {
		'/': {
			name: 'Home',
			link: {
				to: '/',
			},
			Icon: Newspaper,
		},
		'/friends': {
			name: 'Friends',
			title: 'Friends',
			Icon: HeartHandshake,
			link: {
				to: '/friends',
			},
		},
		'/friends/chats': {
			name: 'Chats',
			title: 'Chats',
			Icon: MessagesSquare,
			inexact: true,
			link: {
				to: '/friends/chats',
			},
			useBadge: () => useUnreadChatsCount(),
		},
		'/friends/invite': {
			name: 'Invite',
			title: 'Invite to Sunlo',
			Icon: Share,
			link: {
				to: '/friends/invite',
			},
		},
		'/learn': {
			name: 'Home',
			title: 'All Decks',
			Icon: Home,
			link: {
				to: '/learn',
			},
		},
		'/learn/browse': {
			name: 'Browse',
			title: 'Browse Library',
			Icon: Compass,
			link: {
				to: '/learn/browse',
			},
		},
		'/learn/add-deck': {
			name: 'Deck',
			title: 'Start a New Deck',
			Icon: HeartPlus,
			link: {
				to: '/learn/add-deck',
			},
		},
		'/learn/contributions': {
			name: 'Contributions',
			title: 'Your Contributions',
			Icon: CircleStar,
			link: {
				to: '/learn/contributions',
			},
		},
		'/learn/browse/charts': {
			name: 'Charts',
			title: 'Library Data',
			Icon: BarChart3,
			link: {
				to: '/learn/browse/charts',
			},
		},
		'/search': {
			name: 'Search',
			title: 'Phrase Finder',
			link: {
				to: '/search',
			},
			Icon: Search,
		},
		'/login': {
			name: 'Log in',
			title: 'Sign In',
			link: {
				to: '/login',
			},
			Icon: LogIn,
		},
		'/privacy-policy': {
			name: 'Privacy Policy',
			link: {
				to: '/privacy-policy',
			},
			Icon: FileText,
		},
		'/notifications': {
			name: 'Notifications',
			title: 'Notifications',
			Icon: Bell,
			link: {
				to: '/notifications',
			},
			useBadge: () => useUnreadCount(),
		},
		'/profile': {
			name: 'Profile',
			title: 'View Profile',
			Icon: UserPen,
			link: {
				to: '/profile',
			},
		},
		'/profile/change-email': {
			name: 'Update Email',
			title: 'Update Account Email',
			Icon: Mail,
			link: {
				to: '/profile/change-email',
			},
		},
		'/profile/change-password': {
			name: `Update Password`,
			title: 'Update Password',
			Icon: Lock,
			link: {
				to: '/profile/change-password',
			},
		},
		'/signup': {
			name: 'Sign up',
			title: 'Get Started',
			link: {
				to: '/signup',
			},
			Icon: UserPlus,
		},
	}
	if (!lang) return constantLinks

	const languageLinks = {
		'/learn/$lang': {
			name: `Home`,
			title: `${languages[lang]} Home`,
			link: {
				to: '/learn/$lang',
				params: { lang },
			},
			Icon: HouseHeart,
		},
		'/learn/$lang/search': {
			name: `Search`,
			title: `Quick Search ${languages[lang]}`,
			link: {
				to: '/learn/$lang/feed',
				params: { lang },
				search: (prev: Record<string, unknown>) => ({
					...prev,
					search: true,
				}),
			},
			Icon: Search,
		},
		'/learn/$lang/stats': {
			name: 'Stats',
			title: `My Review Stats`,
			Icon: ChartBarDecreasing,
			link: {
				to: '/learn/$lang/stats',
				params: { lang },
			},
		},
		'/learn/$lang/deck-settings': {
			name: 'Settings',
			title: 'Deck Settings',
			link: {
				to: '/learn/$lang/deck-settings',
				params: { lang },
			},
			Icon: Settings,
		},
		'/learn/$lang/review': {
			name: 'Review',
			title: `Daily Review`,
			link: {
				to: '/learn/$lang/review',
				params: { lang },
			},
			Icon: Rocket,
			useBadge: () => {
				const remaining = useActiveReviewRemaining(
					lang as string,
					todayString()
				)
				// Show badge only when there's an active review with remaining cards
				return remaining && remaining > 0 ? remaining : undefined
			},
		},
		'/learn/$lang/feed': {
			name: `Feed`,
			title: `${languages[lang]} Feed`,
			link: {
				to: '/learn/$lang/feed',
				params: { lang },
			},
			Icon: Logs,
		},
		'/learn/$lang/phrases/new': {
			name: 'Phrase',
			title: 'Add a Phrase',
			link: {
				to: '/learn/$lang/phrases/new',
				params: { lang },
			},
			Icon: MessageSquareQuote,
		},
		'/learn/$lang/contributions': {
			name: 'Contributions',
			title: 'My Contributions',
			link: {
				to: '/learn/$lang/contributions',
				params: { lang },
			},
			Icon: CircleStar,
		},
		'/learn/$lang/manage-deck': {
			name: 'Cards',
			title: 'Manage Deck',
			link: {
				to: '/learn/$lang/manage-deck',
				params: { lang },
			},
			Icon: TableProperties,
		},
		'/learn/$lang/requests/new': {
			name: 'Request',
			title: 'Request a Phrase',
			link: {
				to: '/learn/$lang/requests/new',
				params: { lang },
			},
			Icon: MessageCircleHeart,
		},
		'/learn/$lang/playlists': {
			name: 'Playlists',
			title: `${languages[lang]} Playlists`,
			link: {
				to: '/learn/$lang/playlists',
				params: { lang },
			},
			Icon: Logs,
		},
		'/learn/$lang/playlists/new': {
			name: 'Playlist',
			title: 'New Playlist',
			link: {
				to: '/learn/$lang/playlists/new',
				params: { lang },
			},
			Icon: ListPlus,
		},
		'/admin/$lang/phrases': {
			name: 'Phrases',
			title: 'Admin: Phrases',
			link: {
				to: '/admin/$lang/phrases',
				params: { lang },
			},
			inexact: true,
			Icon: FileText,
		},
		'/admin/$lang/requests': {
			name: 'Requests',
			title: 'Admin: Requests',
			link: {
				to: '/admin/$lang/requests',
				params: { lang },
			},
			inexact: true,
			Icon: MessageCircleHeart,
		},
	}

	return { ...constantLinks, ...languageLinks }
}

export function useLinks(paths: Array<string> | undefined): LinkType[] {
	const { lang } = useParams({ strict: false })
	return makeLinks(paths, lang)
}

export function makeLinks(
	paths: Array<string> | undefined,
	lang?: string
): LinkType[] {
	if (!paths) return []
	const l = links(lang)
	return paths.map((p) => l[p]).filter(Boolean)
}
