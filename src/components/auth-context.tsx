import {
	type PropsWithChildren,
	useState,
	useEffectEvent,
	useLayoutEffect,
} from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

import type { RolesEnum } from '@/types/main'
import supabase from '@/lib/supabase-client'
import { clearUser, myProfileCollection } from '@/lib/collections'
import { AuthContext, AuthLoaded, emptyAuth } from '@/lib/use-auth'

export function AuthProvider({ children }: PropsWithChildren) {
	const [sessionState, setSessionState] = useState<Session | null>(null)
	const [isLoaded, setIsLoaded] = useState(false)

	const handleNewAuthState = useEffectEvent(
		(event: AuthChangeEvent | 'GET_SESSION', session: Session | null) => {
			console.log(`User auth event: ${event}`)
			if (event === 'SIGNED_OUT' || sessionState?.user.id !== session?.user.id)
				void clearUser()
			if (sessionState?.user.id) {
				void myProfileCollection.preload()
			}
			setSessionState(session)
			setIsLoaded(true)
		}
	)

	useLayoutEffect(() => {
		void supabase.auth.getSession().then(({ data: { session }, error }) => {
			if (error) throw error
			handleNewAuthState('GET_SESSION', session)
		})
		const { data: listener } =
			supabase.auth.onAuthStateChange(handleNewAuthState)

		return () => {
			listener.subscription.unsubscribe()
		}
	}, [])

	const value =
		isLoaded ?
			({
				isAuth: sessionState?.user.role === 'authenticated',
				userId: sessionState?.user.id ?? null,
				userEmail: sessionState?.user.email ?? null,
				userRole:
					(sessionState?.user?.user_metadata?.role as RolesEnum) ?? null,
				isLoaded: true,
			} as AuthLoaded)
		:	emptyAuth

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
