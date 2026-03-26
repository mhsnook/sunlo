import type { Database } from './supabase'
import type { Route } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'

export type uuid = string
export type pids = Array<uuid>

export type RolesEnum = 'learner' | 'helper' | 'both'

export type Tag = {
	id: uuid
	name: string
}

export type SelectOption = { value: string; label: string }

// Base microcopy type: name (compact, with icon) + title (descriptive, standalone)
// Used as the foundation for nav links, action buttons, status labels, etc.
export type Microcopy = {
	name: string
	title?: string
	Icon?: LucideIcon
	iconClassName?: string
}

// For actions with imperative verb forms and success/error feedback
export type ActionCopy = Microcopy & {
	action?: string // imperative label ("Add to deck", "Skip this phrase")
	actionSecond?: string // helper text for the action
	done?: string // success/confirmation toast text
	failed?: string // error toast text
}

export type LinkType = Microcopy & {
	inexact?: boolean
	link: {
		to: string
		params?: Route['types']['params']
		search?:
			| Record<string, unknown>
			| ((prev: Record<string, unknown>) => Record<string, unknown>)
	}
	useBadge?: () => number | string | boolean | undefined | null
}
export type MenuType = LinkType & {
	items: Array<LinkType>
}

export type TitleBar = {
	title: string
	subtitle?: string
	onBackClick?: string
}

export type RPCFunctions = Database['public']['Functions']

export type UseLiveQueryResult<T> = {
	data?: T | undefined
	isReady?: boolean
	isLoading?: boolean
}
