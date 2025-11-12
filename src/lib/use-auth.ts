import { createContext, useContext } from 'react'

import { RolesEnum, uuid } from '@/types/main'

export const emptyAuth = {
	isLoaded: false,
	isAuth: false,
	userId: null,
	userEmail: null,
	userRole: null,
} as const

type AuthNotLoaded = Readonly<typeof emptyAuth>

type AuthNotLoggedIn = {
	isLoaded: true
	isAuth: false
	userId: null
	userEmail: null
	userRole: null
}
type AuthLoggedIn = {
	isLoaded: true
	isAuth: true
	userId: uuid
	userEmail: string
	userRole: RolesEnum
}

export type AuthLoaded = AuthNotLoggedIn | AuthLoggedIn
export type AuthState = AuthLoaded | AuthNotLoaded

export const AuthContext = createContext<AuthState>(emptyAuth)

// Access the context's value from inside a provider
export function useAuth() {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error('You need to wrap AuthProvider.')
	}
	return context
}

export function useUserId(): string
export function useUserId(mode: 'default' | 'strict'): string
export function useUserId(mode: 'relaxed'): string | null
export function useUserId(mode: 'relaxed' | 'default' | 'strict' = 'default') {
	const { userId } = useAuth()
	if (!userId && mode === 'default') {
		console.log(`We expected a userId here... but got ${userId}`)
	}
	if (!userId && mode === 'strict') {
		throw new Error(`Expected a userId here but got: ${userId}`)
	}
	return userId!
}
