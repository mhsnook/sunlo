import {
	type PropsWithChildren,
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { useAuth } from '@/lib/hooks'
import {
	type UserCollections,
	initializeUserCollections,
} from '@/lib/collections'
import { Loader } from './ui/loader'
import { uuid } from '@/types/main'

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

	useEffect(() => {
		// never initialize collections before auth. once isLoaded becomes true,
		// it never becomes false again after this, so no need to destroy the object.
		if (!auth.isLoaded) return

		// if we're not logged in and there's no collections object, all is well
		if (!auth.isAuth && !collections) return

		// if collections object exists, and user Id matches auth, all is well
		if (collections && auth.userId === collections.userId) return

		const setup = (userId: uuid) => {
			const db = initializeUserCollections(userId)
			void db.profile.preload()
			void db.decks.preload()
			void db.friends.preload()
			setCollections(db)
		}
		const destroy = async () => {
			await collections?.cleanupAll().then(() => {
				setCollections(null)
			})
		}

		// now there are three scenarios requiring changes:
		// 1. logout: destroy
		// 2. login: setup
		// 3. switch user: destroy and then setup
		if (!collections && auth.isAuth) {
			setup(auth.userId)
		} else if (collections && !auth.isAuth) {
			void destroy()
		} else if (
			collections &&
			auth.isAuth &&
			auth.userId !== collections.userId
		) {
			void destroy().then(() => setup(auth.userId))
		}
	}, [auth.isLoaded, auth.isAuth, auth.userId, setCollections, collections])

	const value: CollectionsState = useMemo(
		() => ({
			collections,
			isReady: (collections?.userId ?? null) === auth.userId,
		}),
		[collections, auth.userId]
	)

	return (
		<CollectionsContext.Provider value={value}>
			{value.isReady ? children : <Loader />}
		</CollectionsContext.Provider>
	)
}

export const useCollections = () => useContext(CollectionsContext)
