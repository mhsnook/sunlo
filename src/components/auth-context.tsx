import {
	type PropsWithChildren,
	useState,
	useEffect,
	useMemo,
	useEffectEvent,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'

import type { RolesEnum } from '@/types/main'
import supabase from '@/lib/supabase-client'
import { myProfileCollection } from '@/lib/collections'
import { AuthContext, AuthLoaded, emptyAuth } from '@/lib/use-auth'

export function AuthProvider({ children }: PropsWithChildren) {
	const queryClient = useQueryClient()
	const [sessionState, setSessionState] = useState<Session | null>(null)
	const [isLoaded, setIsLoaded] = useState(false)

	const safeInitialise = useEffectEvent(() => {
		console.log('safeInitialise')
		if (!sessionState && !isLoaded) {
			console.log('safeInitialise if = true')
			void supabase.auth.getSession().then(({ data: { session }, error }) => {
				console.log('safeInitialise then stmt')
				setSessionState(session)
				if (!error) setIsLoaded(true)
				else throw error
			})
		}
	})

	useEffect(() => {
		if (!queryClient) {
			console.log('Returning early bc queryClient hook has not come back')
			return
		}

		const { data: listener } = supabase.auth.onAuthStateChange(
			async (event, session) => {
				console.log(`User auth event: ${event}`, session)

				if (event === 'SIGNED_OUT')
					queryClient.removeQueries({ queryKey: ['user'] })

				if (event === 'INITIAL_SESSION') await myProfileCollection.preload()

				if (event === 'SIGNED_IN' && session)
					await myProfileCollection.utils.refetch()

				setSessionState(session)
				setIsLoaded(true)
			}
		)
		safeInitialise()

		return () => {
			listener.subscription.unsubscribe()
		}
	}, [queryClient])

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
