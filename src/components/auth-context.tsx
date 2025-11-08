import {
	type PropsWithChildren,
	createContext,
	useState,
	useEffect,
	useMemo,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'

import type { RolesEnum, uuid } from '@/types/main'
import supabase from '@/lib/supabase-client'
import { cleanupUser, preloadUser } from '@/lib/collections'
import { Loader } from '@/components/ui/loader'

const emptyAuth = {
	isLoaded: false,
	isAuth: false,
	userId: null,
	userEmail: null,
	userRole: null,
} as const

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

export type AuthState = AuthLoggedIn | AuthNotLoggedIn | AuthNotLoaded

export const AuthContext = createContext<AuthState>(emptyAuth)

export function AuthProvider({ children }: PropsWithChildren) {
	const queryClient = useQueryClient()
	const [sessionState, setSessionState] = useState<Session | null | undefined>(
		undefined
	)

	useEffect(() => {
		// console.log(`Adding auth-state listener`)
		if (!queryClient) {
			console.log('Returning early bc queryClient hook has not come back')
			return
		}

		const { data: listener } = supabase.auth.onAuthStateChange(
			(event, session) => {
				console.log(`User auth event: ${event}`)
				if (!session && sessionState?.user.id) {
					// console.log(`1st condition`)
					void cleanupUser().then(() => setSessionState(session))
				} else if (session && !sessionState?.user.id) {
					// console.log(`2st condition`)
					void preloadUser().then(() => setSessionState(session))
				} else if (
					sessionState?.user.id &&
					sessionState?.user.id !== session?.user.id
				) {
					// console.log(`3st condition`)
					void cleanupUser().then(() =>
						preloadUser().then(() => setSessionState(session))
					)
				} else {
					// console.log(`4st condition`)
					setSessionState(session)
				}
			}
		)

		return () => {
			listener.subscription.unsubscribe()
		}
	}, [queryClient, setSessionState, sessionState?.user.id])

	const isSet = sessionState !== undefined
	const value = useMemo(() => {
		/* console.log(`Running useMemo for new auth state`, {
			isAuth: sessionState?.user.role === 'authenticated',
			userId: sessionState?.user.id ?? null,
			userEmail: sessionState?.user.email ?? null,
			userRole: (sessionState?.user?.user_metadata?.role as RolesEnum) ?? null,
			isLoaded: true,
		}) */
		return isSet ?
				{
					isAuth: sessionState?.user.role === 'authenticated',
					userId: sessionState?.user.id ?? null,
					userEmail: sessionState?.user.email ?? null,
					userRole:
						(sessionState?.user?.user_metadata?.role as RolesEnum) ?? null,
					isLoaded: true,
				}
			:	emptyAuth
	}, [
		sessionState?.user.role,
		sessionState?.user.id,
		sessionState?.user.email,
		sessionState?.user.user_metadata?.role,
		isSet,
	])

	return (
		<AuthContext.Provider value={value as AuthState}>
			{value.isLoaded ? children : <AwaitingAuthLoader />}
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
