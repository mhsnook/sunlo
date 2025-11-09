import { type PropsWithChildren, useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks'
import {
	cleanupUser,
	myProfileCollection,
	preloadUser,
} from '@/lib/collections'
import { AwaitingAuthLoader } from '@/components/awaiting-auth-loader'

export function ProfileProvider({ children }: PropsWithChildren) {
	const auth = useAuth()
	const [isProfileReady, setProfileReady] = useState(false)

	useEffect(() => {
		// This effect runs when the auth state changes.
		const handleProfileLoading = async () => {
			// Wait until the auth provider has a definitive state.
			if (!auth.isLoaded) {
				return
			}

			// If the user is authenticated, preload their data.
			if (auth.isAuth) {
				await myProfileCollection.utils.refetch()
				await preloadUser()
			} else {
				// If logged out, ensure any cached user data is cleared.
				await cleanupUser()
			}

			// Once preloading or cleanup is done, mark the profile as ready.
			setProfileReady(true)
		}

		// const profileAbort =
		void handleProfileLoading()
		// return () => Promise.reject(profileAbort)
	}, [auth.isLoaded, auth.isAuth])

	// Render children only when the profile state is ready.
	// The AwaitingAuthLoader is generic enough to be used here.
	return isProfileReady ? children : <AwaitingAuthLoader />
}
