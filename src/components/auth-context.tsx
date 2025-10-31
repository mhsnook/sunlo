import {
	type PropsWithChildren,
	createContext,
	useState,
	useEffect,
	useMemo,
} from 'react'

import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import { AuthState, RolesEnum } from '@/types/main'
import { myProfileCollection } from '@/lib/collections'

export const AuthContext = createContext<AuthState>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
	const queryClient = useQueryClient()
	const [sessionState, setSessionState] = useState<Session | null>(null)
	const [isLoaded, setIsLoaded] = useState(false)

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
			async (event, session) => {
				console.log(`User auth event: ${event}`)

				if (event === 'SIGNED_OUT')
					queryClient.removeQueries({ queryKey: ['user'] })

				if (event === 'INITIAL_SESSION')
					await myProfileCollection.preload()

				if (event === 'SIGNED_IN' && session)
					await myProfileCollection.utils.refetch()

				setSessionState(session)
				setIsLoaded(true)
			}
		)

		return () => {
			listener.subscription.unsubscribe()
		}
	}, [queryClient])

	const value = useMemo(
		() => ({
			isAuth: sessionState?.user.role === 'authenticated',
			userId: sessionState?.user.id ?? null,
			userEmail: sessionState?.user.email ?? null,
			userRole: (sessionState?.user?.user_metadata?.role as RolesEnum) ?? null,
		}),
		[
			sessionState?.user.role,
			sessionState?.user.id,
			sessionState?.user.email,
			sessionState?.user.user_metadata?.role,
		]
	)

	return (
		<AuthContext.Provider value={value}>
			{isLoaded ? children : null}
		</AuthContext.Provider>
	)
}
