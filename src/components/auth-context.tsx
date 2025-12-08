import {
	type PropsWithChildren,
	useState,
	useEffect,
	useMemo,
	useCallback,
} from 'react'
import type { Session } from '@supabase/supabase-js'

import type { RolesEnum } from '@/types/main'
import supabase from '@/lib/supabase-client'
import { dbStoreInit } from '@/lib/db-store'
import { AuthContext, AuthLoaded, emptyAuth } from '@/lib/use-auth'

export function AuthProvider({ children }: PropsWithChildren) {
	const [sessionState, setSessionState] = useState<Session | null>(null)
	const [isLoaded, setIsLoaded] = useState(false)
	const clear = useCallback(async () => {
		setIsLoaded(false)
		await supabase.auth.signOut()
	}, [])

	useEffect(() => {
		// Fetch initial session
		void supabase.auth.getSession().then(({ data: { session } }) => {
			console.log(`Initial session fetch`, session)
			setSessionState(session)
			setIsLoaded(true)
		})

		const { data: listener } = supabase.auth.onAuthStateChange(
			(event, session) => {
				console.log(`User auth event: ${event}`, session)
				setSessionState(session)
				setIsLoaded(true)
			}
		)

		return () => {
			listener.subscription.unsubscribe()
		}
	}, [])

	// re-initialize the store whenever uid changes
	useEffect(() => {
		dbStoreInit(sessionState?.user.id)
	}, [sessionState?.user.id])

	const value = useMemo(
		() =>
			isLoaded ?
				({
					isAuth: sessionState?.user.role === 'authenticated',
					userId: sessionState?.user.id ?? null,
					userEmail: sessionState?.user.email ?? null,
					userRole:
						(sessionState?.user?.user_metadata?.role as RolesEnum) ?? null,
					isLoaded: true,
					clear,
				} as AuthLoaded)
			:	emptyAuth,
		[
			sessionState?.user.role,
			sessionState?.user.id,
			sessionState?.user.email,
			sessionState?.user.user_metadata?.role,
			isLoaded,
		]
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
