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
// Don't keep using these. use the framework's types for links and routes
export type LinkType = {
	name: string
	title?: string
	inexact?: boolean
	link: {
		to: string
		params?: Route['types']['params']
	}
	// TODO enum these for the caller
	Icon?: LucideIcon
	useBadge?: () => number | string | boolean | undefined | null
}
export type MenuType = LinkType & {
	items: Array<LinkType>
}

export type TitleBar = {
	title: string
	subtitle?: string
	onBackClick?: string | (() => void)
}

export type RPCFunctions = Database['public']['Functions']

export type UseLiveQueryResult<T> = {
	data?: T | undefined
	isReady?: boolean
	isLoading?: boolean
}
