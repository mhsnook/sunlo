import {
	type PropsWithChildren,
	createContext,
	useState,
	useEffect,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'

import type { RolesEnum, uuid } from '@/types/main'
import supabase from '@/lib/supabase-client'
import { clearUser, myProfileCollection } from '@/lib/collections'
import { Loader } from '@/components/ui/loader'

const emptyAuth = {
	isLoaded: false,
	isAuth: false,
	userId: null,
	userEmail: null,
	userRole: null,
} as AuthAny

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

type AuthAny = {
	isLoaded: boolean
	isAuth: boolean
	userId: uuid | null
	userEmail: string | null
	userRole: RolesEnum | null
}

export type AuthState = AuthLoggedIn | AuthNotLoggedIn | AuthNotLoaded

export const AuthContext = createContext<AuthAny>(emptyAuth)

const authFromSession = (session: Session | null) => ({
	isAuth: session?.user.role === 'authenticated',
	userId: session?.user.id ?? null,
	userEmail: session?.user.email ?? null,
	userRole: (session?.user?.user_metadata?.role as RolesEnum) ?? null,
	isLoaded: true,
})

export function AuthProvider({ children }: PropsWithChildren) {
	const queryClient = useQueryClient()
	const [sessionState, setSessionState] = useState<Session | null>(null)
	const [auth, setAuth] = useState<AuthState>(emptyAuth)

	useEffect(() => {
		const newAuth = authFromSession(sessionState)
		// check if anything AuthState tracks has changed
		if (
			auth.userId !== newAuth.userId ||
			auth.isAuth !== newAuth.isAuth ||
			auth.isLoaded !== newAuth.isLoaded ||
			auth.userEmail !== newAuth.userEmail ||
			auth.userRole !== newAuth.userRole
		) {
			if (auth.isAuth && !newAuth.isAuth) clearUser()
			if (!auth.userId && newAuth.userId) {
				myProfileCollection.preload()
			}
			console.log(`Changing auth from, to`, auth, newAuth)
			setAuth(newAuth)
		}
	}, [sessionState])

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
				try {
					setSessionState(session)
				} catch (error) {
					console.error('Error setting session state:', error)
				}
			}
		)

		return () => {
			listener.subscription.unsubscribe()
		}
	}, [queryClient])

	return (
		<AuthContext.Provider value={auth as AuthState}>
			{auth.isLoaded ? children : <AwaitingAuthLoader />}
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
