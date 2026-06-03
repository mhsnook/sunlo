import {
	type PropsWithChildren,
	useState,
	useRef,
	useEffectEvent,
	useLayoutEffect,
} from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

import type { RolesEnum } from '@/types/main'
import supabase, { pingSupabase } from '@/lib/supabase-client'
import { authLifecycle } from '@/lib/auth-lifecycle'
import { AuthContext, AuthLoaded, emptyAuth } from '@/lib/use-auth'

async function checkAdminStatus(): Promise<boolean> {
	const { data } = await supabase.from('admin_user').select('uid')
	return (data?.length ?? 0) > 0
}

export function AuthProvider({ children }: PropsWithChildren) {
	const [sessionState, setSessionState] = useState<Session | null>(null)
	// Monotonic latch: true once the auth client has reported its first
	// session (or null). RouterProvider gates on it and stays mounted for
	// the rest of the session; route loaders own data loading.
	const [isLoaded, setIsLoaded] = useState(false)
	const [isAdmin, setIsAdmin] = useState(false)
	const [connectionError, setConnectionError] = useState<Error | null>(null)
	// The first event onAuthStateChange delivers — whatever it is; supabase
	// can emit SIGNED_IN / TOKEN_REFRESHED ahead of INITIAL_SESSION when the
	// stored token needs refreshing — is a boot-time read, not a transition.
	// Skip the identity-change clear (and persisted-cache wipe) for it.
	const initialAuthSeen = useRef(false)

	const handleNewAuthState = useEffectEvent(
		(event: AuthChangeEvent, session: Session | null) => {
			console.log(`User auth event: ${event}`)
			const prevUserId = sessionState?.user.id ?? null
			const nextUserId = session?.user.id ?? null

			const isInitial = !initialAuthSeen.current
			initialAuthSeen.current = true
			const isIdentityChange = !isInitial && prevUserId !== nextUserId

			if (isIdentityChange) {
				authLifecycle.clearAllUserDataOnIdentityChange(nextUserId)
			}
			if (isIdentityChange && !nextUserId) setIsAdmin(false)

			if (nextUserId && (isInitial || isIdentityChange)) {
				// Defer out of the auth callback: the auth client holds an
				// internal lock for its duration and a query fired inside it can
				// go out unauthenticated. A macrotask hop releases the lock.
				setTimeout(() => {
					void checkAdminStatus().then(setIsAdmin)
				}, 0)
			}

			setSessionState(session)
			setIsLoaded(true)
		}
	)

	useLayoutEffect(() => {
		// pingSupabase() surfaces a "backend unreachable" error —
		// onAuthStateChange reads the restored session from localStorage and
		// never makes a network call on its own, so it can't catch this.
		void pingSupabase().catch((error: unknown) => {
			console.error('Supabase unreachable:', error)
			setConnectionError(
				error instanceof Error ? error : new Error('Unknown connection error')
			)
			setIsLoaded(true)
		})
		const { data: listener } =
			supabase.auth.onAuthStateChange(handleNewAuthState)

		return () => {
			listener.subscription.unsubscribe()
		}
	}, [])

	const value = isLoaded
		? ({
				isAuth: sessionState?.user.role === 'authenticated',
				userId: sessionState?.user.id ?? null,
				userEmail: sessionState?.user.email ?? null,
				userRole:
					(sessionState?.user?.user_metadata?.role as RolesEnum) ?? null,
				isAdmin,
				isLoaded: true,
				connectionError,
			} as AuthLoaded)
		: { ...emptyAuth, connectionError }

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
