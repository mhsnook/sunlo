import {
	type PropsWithChildren,
	createContext,
	useContext,
	useEffect,
	useState,
} from 'react'
import { useAuth } from '@/lib/hooks'
import {
	type UserCollections,
	initializeUserCollections,
} from '@/lib/collections'
import { Loader } from './ui/loader'

type CollectionsState = {
	collections: UserCollections | null
	isReady: boolean
}

const CollectionsContext = createContext<CollectionsState>({
	collections: null,
	isReady: false,
})

export function CollectionsProvider({ children }: PropsWithChildren) {
	const auth = useAuth()
	const [collections, setCollections] = useState<UserCollections | null>(null)
	const [isReady, setIsReady] = useState(false)

	useEffect(() => {
		if (auth.isAuth) {
			const userCollections = initializeUserCollections(auth.userId)
			setCollections(userCollections)
			// Preload essential collections
			const preloadCollections = async () => {
				await Promise.all([
					userCollections.myProfile.preload(),
					userCollections.decks.preload(),
					userCollections.friendSummaries.preload(),
				])
				setIsReady(true)
			}
			void preloadCollections()
		} else {
			// If user logs out, reset the state
			setCollections(null)
			setIsReady(false)
		}
	}, [auth.isAuth, auth.userId])

	if (auth.isAuth && (!isReady || !collections)) {
		return <Loader />
	}

	return (
		<CollectionsContext.Provider value={{ collections, isReady }}>
			{children}
		</CollectionsContext.Provider>
	)
}

export const useCollections = () => useContext(CollectionsContext)
