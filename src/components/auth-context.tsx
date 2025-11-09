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
import { AwaitingAuthLoader } from '@/components/awaiting-auth-loader'

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

	const isSet = sessionState !== undefined
	const value = useMemo(() => {
		return isSet ?
				{
					isAuth: sessionState?.user.role === 'authenticated',
					userId: sessionState?.user.id ?? null,
					userEmail: sessionState?.user.email ?? null,
					userRole:
						(sessionState?.user?.user_metadata?.role as RolesEnum) ?? null,
					isLoaded: true,
				}
			:	emptyAuth
	}, [
		sessionState?.user.role,
		sessionState?.user.id,
		sessionState?.user.email,
		sessionState?.user.user_metadata?.role,
		isSet,
	])

	return (
		<AuthContext.Provider value={value as AuthState}>
			{value.isLoaded ? children : <AwaitingAuthLoader />}
		</AuthContext.Provider>
	)
}
