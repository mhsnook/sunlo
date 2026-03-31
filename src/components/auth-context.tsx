import {
	type PropsWithChildren,
	useState,
	useEffectEvent,
	useLayoutEffect,
} from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

import type { RolesEnum } from '@/types/main'
import supabase from '@/lib/supabase-client'
import { myProfileCollection } from '@/features/profile/collections'
import { decksCollection } from '@/features/deck/collections'
import {
	chatMessagesCollection,
	friendSummariesCollection,
} from '@/features/social/collections'
import { clearUser } from '@/lib/collections/clear-user'
import { AuthContext, AuthLoaded, emptyAuth } from '@/lib/use-auth'

export function AuthProvider({ children }: PropsWithChildren) {
	const [sessionState, setSessionState] = useState<Session | null>(null)
	const [isLoaded, setIsLoaded] = useState(false)
	const [isReady, setIsReady] = useState(false)

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
				// Profile must load before isReady goes true so the _user loader
				// finds the profile collection populated (avoids race condition).
				void myProfileCollection.utils.refetch().then(() => setIsReady(true))
				void decksCollection.utils.refetch()
				void friendSummariesCollection.utils.refetch()
				// Refetch chat messages if previously loaded (for correct RLS filtering)
				if (chatMessagesCollection.size > 0) {
					void chatMessagesCollection.utils.refetch()
				}
				setSessionState(session)
				setIsLoaded(true)
				return
			}
			setSessionState(session)
			setIsLoaded(true)
			setIsReady(true)
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
				isReady,
				userId: sessionState?.user.id ?? null,
				userEmail: sessionState?.user.email ?? null,
				userRole:
					(sessionState?.user?.user_metadata?.role as RolesEnum) ?? null,
				isAdmin: !!sessionState?.user?.app_metadata?.is_admin,
				isLoaded: true,
			} as AuthLoaded)
		:	emptyAuth

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
