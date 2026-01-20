import {
	type PropsWithChildren,
	useState,
	useEffectEvent,
	useLayoutEffect,
} from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

import type { RolesEnum } from '@/types/main'
import supabase from '@/lib/supabase-client'
import {
	chatMessagesCollection,
	clearUser,
	decksCollection,
	friendSummariesCollection,
	myProfileCollection,
} from '@/lib/collections'
import { AuthContext, AuthLoaded, emptyAuth } from '@/lib/use-auth'

export function AuthProvider({ children }: PropsWithChildren) {
	const [sessionState, setSessionState] = useState<Session | null>(null)
	const [isLoaded, setIsLoaded] = useState(false)

	const handleNewAuthState = useEffectEvent(
		(event: AuthChangeEvent | 'GET_SESSION', session: Session | null) => {
			console.log(`User auth event: ${event}`)
			// Only clear user data when:
			// 1. Explicitly signing out, OR
			// 2. Switching between two different authenticated users
			// Do NOT clear when logging in from a logged-out state (null -> user)
			// as this causes live query errors from cleaning up subscribed collections
			const isSigningOut = event === 'SIGNED_OUT'
			const isSwitchingUsers =
				sessionState?.user.id &&
				session?.user.id &&
				sessionState.user.id !== session.user.id
			if (isSigningOut || isSwitchingUsers) {
				void clearUser()
			}
			// Refetch user collections only when logging in from a logged-out state
			// (not on token refresh or other events that already have a user)
			const isLoggingIn = !sessionState?.user.id && session?.user.id
			if (isLoggingIn) {
				void myProfileCollection.utils.refetch()
				void decksCollection.utils.refetch()
				void friendSummariesCollection.utils.refetch()
				// Refetch chat messages if previously loaded (for correct RLS filtering)
				if (chatMessagesCollection.size > 0) {
					void chatMessagesCollection.utils.refetch()
				}
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
