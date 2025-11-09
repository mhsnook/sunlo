import {
	type PropsWithChildren,
	createContext,
	useState,
	useEffect,
	useMemo,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import type { RolesEnum, uuid } from '@/types/main'
import supabase from '@/lib/supabase-client'

const emptyAuth = {
	isLoaded: false,
	isAuth: false,
	userId: null,
	userEmail: null,
	userRole: null,
} as const

type AuthNotLoaded = typeof emptyAuth

export type AuthNotLoggedIn = {
	isLoaded: true
	isAuth: false
	userId: null
	userEmail: null
	userRole: null
}
export type AuthLoggedIn = {
	isLoaded: true
	isAuth: true
	userId: uuid
	userEmail: string
	userRole: RolesEnum
}

export type AuthState = AuthLoggedIn | AuthNotLoggedIn | AuthNotLoaded

export const AuthContext = createContext<AuthState>(emptyAuth)

export function AuthProvider({ children }: PropsWithChildren) {
	const [sessionState, setSessionState] = useState<Session | null | undefined>(
		undefined
	)

	useEffect(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			console.log(`Auth event: ${event}`)
			setSessionState(session)
		})

		return () => {
			subscription.unsubscribe()
		}
	}, [])

	const value = useMemo(() => {
		const isAuth = sessionState?.user.role === 'authenticated'
		if (sessionState === undefined) return emptyAuth
		if (!isAuth || !sessionState)
			return {
				isLoaded: true,
				isAuth: false,
				userId: null,
				userEmail: null,
				userRole: null,
			}
		return {
			isAuth: true,
			userId: sessionState.user.id,
			userEmail: sessionState.user.email!,
			userRole: (sessionState.user.user_metadata?.role as RolesEnum) ?? null,
			isLoaded: true,
		}
	}, [sessionState])

	return (
		<AuthContext.Provider value={value as AuthState}>
			{children}
		</AuthContext.Provider>
	)
}
