import {
	type PropsWithChildren,
	createContext,
	useState,
	useEffect,
} from 'react'

import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import { AuthState, RolesEnum } from '@/types/main'

export const AuthContext = createContext<AuthState>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
	const queryClient = useQueryClient()
	const [sessionState, setSessionState] = useState<Session | null>(null)
	const [isLoaded, setIsLoaded] = useState(false)
	const setLoaded = () => setIsLoaded(true)

	/*
    This effect should run once when the app first mounts (the context provider), and then
    hopefully never again. We're just going to attach this auth-state-change listener, and whenever
    the auth state changes, we check what kind of change has happened, update the state hook and do
    whatever cache invalidation is needed.

    Normally we would want to use a useQuery() hook to fetch the user info and pass the data
    directly as the context value (per https://tkdodo.eu/blog/react-query-and-react-context), but
    supabase-js is giving us this handy listener to update state, and so far we've never
    encountered a race condition where 'INITIAL_SESSION' fires after the listener is attached.
  */

	useEffect(() => {
		if (!queryClient) {
			console.log('Returning early bc queryClient hook has not come back')
			return
		}
		const { data: listener } = supabase.auth.onAuthStateChange(
			(event, session) => {
				console.log(`User auth event: ${event}`)
				// if we've logged out or no user comes back, we should remove user data from cache
				if (event === 'SIGNED_OUT' || !session?.user) {
					queryClient.removeQueries({ queryKey: ['user'] })
				}
				setSessionState(session)
				setLoaded()
			}
		)

		return () => {
			listener.subscription.unsubscribe()
		}
	}, [queryClient])

	const value = {
		isAuth: sessionState?.user.role === 'authenticated',
		userId: sessionState?.user.id ?? null,
		userEmail: sessionState?.user.email ?? null,
		userRole: (sessionState?.user?.user_metadata?.role as RolesEnum) ?? null,
	}

	return (
		<AuthContext.Provider value={value}>
			{isLoaded ? children : null}
		</AuthContext.Provider>
	)
}
