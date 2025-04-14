import {
	BookHeart,
	ClipboardPlus,
	FileText,
	HeartHandshake,
	Home,
	Lock,
	LogIn,
	Mail,
	MessageSquarePlus,
	Rocket,
	School,
	Search,
	Send,
	Settings,
	UserPen,
	UserPlus,
} from 'lucide-react'
import languages from '../lib/languages'
import { useMemo } from 'react'
import { LinkType } from '@/types/main'
import { useParams } from '@tanstack/react-router'

const links = (lang?: string): Record<string, LinkType> => ({
	'/': {
		name: 'Home',
		link: {
			to: '/',
		},
		Icon: Home,
	},
	'/friends': {
		name: 'Contacts',
		title: 'Friends and contacts',
		Icon: HeartHandshake,
		link: {
			to: '/friends',
		},
	},
	'/friends/search': {
		name: 'Search',
		title: 'Search profiles',
		Icon: Search,
		link: {
			to: '/friends/search',
		},
	},
	'/friends/invite': {
		name: 'Invite',
		title: 'Invite to Sunlo',
		Icon: Send,
		link: {
			to: '/friends/invite',
		},
	},
	'/learn': {
		name: 'Home',
		title: 'Learning home',
		Icon: Home,
		link: {
			to: '/learn',
		},
	},
	'/learn/add-deck': {
		name: 'Deck',
		title: 'Start a new language',
		Icon: ClipboardPlus,
		link: {
			to: '/learn/add-deck',
		},
	},
	'/learn/$lang': {
		name: languages[lang],
		title: `${languages[lang]} deck`,
		Icon: BookHeart,
		link: {
			to: '/learn/$lang',
			params: { lang },
		},
	},
	'/learn/$lang/search': {
		name: `Search`,
		title: `Quick search ${languages[lang]}`,
		link: {
			to: '/learn/$lang/search',
			params: { lang },
		},
		Icon: Search,
	},
	'/learn/$lang/deck-settings': {
		name: 'Settings',
		title: 'Deck settings',
		link: {
			to: '/learn/$lang/deck-settings',
			params: { lang },
		},
		Icon: Settings,
	},
	'/learn/$lang/review': {
		name: 'Review',
		title: 'Start a review',
		link: {
			to: '/learn/$lang/review',
			params: { lang },
		},
		Icon: Rocket,
	},
	'/learn/$lang/library': {
		name: `Library`,
		title: `Browse ${languages[lang]} library`,
		link: {
			to: '/learn/$lang/library',
			params: { lang },
		},
		Icon: School,
	},
	'/learn/$lang/add-phrase': {
		name: 'Phrase',
		title: 'Add a phrase',
		link: {
			to: '/learn/$lang/add-phrase',
			params: { lang },
		},
		Icon: MessageSquarePlus,
	},
	'/learn/quick-search': {
		name: 'Search',
		title: 'Quick search',
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
		name: 'Privacy policy',
		link: {
			to: '/privacy-policy',
		},
		Icon: FileText,
	},
	'/profile': {
		name: 'Profile',
		title: 'View profile',
		Icon: UserPen,
		link: {
			to: '/profile',
		},
	},
	'/profile/change-email': {
		name: 'Update email',
		title: 'Update account email',
		Icon: Mail,
		link: {
			to: '/profile/change-email',
		},
	},
	'/profile/change-password': {
		name: `Update password`,
		title: 'Update password',
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
})

export function useLinks(paths: Array<string>) {
	const { lang } = useParams({ strict: false })
	return useMemo(() => makeLinks(paths, lang), [lang, paths])
}

export function makeLinks(paths: Array<string>, lang?: string) {
	if (!paths) return []
	const l = links(lang)
	return paths.map((p) => l[p])
}
