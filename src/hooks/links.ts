import { useMemo } from 'react'
import { useParams } from '@tanstack/react-router'
import { useRelationInvitations } from '@/hooks/use-friends'

import { LinkType } from '@/types/main'
import {
	ChartBarDecreasing,
	CircleStar,
	FileText,
	HandHeart,
	HeartHandshake,
	HeartPlus,
	Home,
	HouseHeart,
	Lock,
	LogIn,
	Logs,
	Mail,
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

const links = (lang?: LangKey): Record<string, LinkType> => {
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
		'/friends/requests': {
			name: 'Requests',
			title: 'Friend Requests',
			Icon: HandHeart,
			link: {
				to: '/friends/requests',
			},
			useBadge: () => useRelationInvitations()?.data?.length,
		},
		'/friends/chats': {
			name: 'Chats',
			title: 'Chats',
			Icon: MessagesSquare,
			inexact: true,
			link: {
				to: '/friends/chats',
			},
		},
		'/friends/search': {
			name: 'Search',
			title: 'Search Profiles',
			Icon: Search,
			link: {
				to: '/friends/search',
			},
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
		'/learn/quick-search': {
			name: 'Search',
			title: 'Quick Search',
			link: {
				to: '/learn/quick-search',
			},
			Icon: Search,
		},
		'/login': {
			name: 'Log in',
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
				to: '/learn/$lang/search',
				params: { lang },
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
		'/learn/$lang/add-phrase': {
			name: 'Phrase',
			title: 'Add a Phrase',
			link: {
				to: '/learn/$lang/add-phrase',
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
		'/learn/$lang/requests/new': {
			name: 'Request',
			title: 'Request a Phrase',
			link: {
				to: '/learn/$lang/requests/new',
				params: { lang },
			},
			Icon: MessageCircleHeart,
		},
	}

	return { ...constantLinks, ...languageLinks }
}

export function useLinks(paths: Array<string> | undefined) {
	const { lang } = useParams({ strict: false })
	return useMemo(() => makeLinks(paths, lang), [lang, paths])
}

export function makeLinks(paths: Array<string> | undefined, lang?: string) {
	if (!paths) return []
	const l = links(lang)
	return paths.map((p) => l[p])
}
