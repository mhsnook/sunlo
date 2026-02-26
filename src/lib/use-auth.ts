import { createContext, useContext } from 'react'

import { RolesEnum, uuid } from '@/types/main'

export const emptyAuth = {
	isLoaded: false,
	isAuth: false,
	isReady: false,
	userId: null,
	userEmail: null,
	userRole: null,
}

type AuthNotLoaded = Readonly<typeof emptyAuth>

type AuthNotLoggedIn = {
	isLoaded: true
	isAuth: false
	isReady: true
	userId: null
	userEmail: null
	userRole: null
}
type AuthLoggedIn = {
	isLoaded: true
	isAuth: true
	isReady: boolean
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

export function useUserId(): string | null {
	return useAuth()?.userId
}
