import {
	type PropsWithChildren,
	createContext,
	useState,
	useEffect,
	useMemo,
	useEffectEvent,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import type { RolesEnum, uuid } from '@/types/main'
import supabase from '@/lib/supabase-client'
import { usePrevious } from '@uidotdev/usehooks'
import {
	cleanupUser,
	myProfileCollection,
	preloadProfile,
	preloadUser,
} from '@/lib/collections'
import { useProfile } from '@/hooks/use-profile'

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
	const [sessionState, setSessionState] = useState<Session | null | undefined>(
		undefined
	)
	const refetchIfAuth = useEffectEvent(() => {
		console.log(`in the useEffectEvent`)
		if (sessionState?.user.role === 'authenticated') {
			console.log(`in the useEffectEvent, if smt true`)
			myProfileCollection.utils.refetch()
		}
	})

	useEffect(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			console.log(`Auth event: ${event}`)
			setSessionState(session)
		})
		myProfileCollection._lifecycle.onFirstReady(refetchIfAuth)

		return () => {
			subscription.unsubscribe()
		}
	}, [])

	const value = useMemo(() => {
		const isAuth = sessionState?.user.role === 'authenticated'
		if (sessionState === undefined) return emptyAuth
		if (!isAuth || !sessionState)
			return {
				isLoaded: true,
				isAuth: false,
				userId: null,
				userEmail: null,
				userRole: null,
			}
		return {
			isAuth: true,
			userId: sessionState.user.id,
			userEmail: sessionState.user.email!,
			userRole: (sessionState.user.user_metadata?.role as RolesEnum) ?? null,
			isLoaded: true,
		}
	}, [sessionState])

	const prevValue = usePrevious(value)

	useEffect(() => {
		if (value.isLoaded === false && value === prevValue) {
			console.log(
				`Profile Provider userEffect condition 0: unready or no change`
			)
		} else if (value.isAuth && !prevValue?.isAuth) {
			// If the user is newly authenticated, preload their data.
			console.log(`Profile Provider userEffect condition 1: preload`)
			preloadProfile()
		} else if (!value.isAuth && prevValue?.isAuth) {
			// If logged out, ensure any cached user data is cleared.
			console.log(`Profile Provider userEffect condition 2: cleanup`)
			cleanupUser()
		} else if (value.isAuth && prevValue?.userId !== value.userId) {
			// if they switch accounts without a logged-out state in between
			console.log(
				`Profile Provider userEffect condition 3: cleanup then preload`
			)
			cleanupUser().then(() => preloadProfile())
		}
	}, [prevValue])

	const { isReady } = useProfile()

	return (
		<AuthContext.Provider value={value as AuthState}>
			{isReady ? children : <>loading...</>}
		</AuthContext.Provider>
	)
}
