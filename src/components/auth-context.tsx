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
import { Loader } from './ui/loader'

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
			{isLoaded ? children : <AwaitingAuthLoader />}
		</AuthContext.Provider>
	)
}

function AwaitingAuthLoader() {
	const [time, setTime] = useState(0)
	useEffect(() => {
		const interval = setInterval(() => {
			setTime((prev) => prev + 1)
		}, 1000)
		return () => clearInterval(interval)
	}, [])

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-4 py-10">
			<p
				className={`${time >= 5 ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 ease-linear`}
			>
				Connecting for {time} seconds...
			</p>

			<Loader
				size={40}
				className={`${time >= 1 ? 'opacity-50' : 'opacity-0'} transition-opacity duration-300 ease-linear`}
			/>

			<div
				className={`${time >= 10 ? 'opacity-100' : 'opacity-0'} max-w-120 space-y-4 text-center transition-opacity duration-300 ease-linear`}
			>
				<p>
					FYI this should never take longer than about 1 second. It's possible
					your internet connection is down.
				</p>
				<p>
					If not that... consider{' '}
					<a className="s-link" href="mailto:sunloapp@gmail.com">
						contacting the team by email
					</a>{' '}
					or get in touch with Em directly (it may be affecting others too).
				</p>
			</div>
		</div>
	)
}
