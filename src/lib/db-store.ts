import { create } from 'zustand'
import { myProfileCollection } from './collections'

export type UserDbStore =
	| {
			userId: null
			profile: null
	  }
	| {
			userId: string
			profile: typeof myProfileCollection
	  }

export const useDbStore = create<UserDbStore>(() => ({
	userId: null,
	profile: null,
}))

// imperatively initialize the profile when things change
export const dbStoreInit = async (userId: string | undefined | null) => {
	const db = useDbStore.getState()
	// only act if there has been a change
	if (db.userId !== userId) {
		console.log(`In init fn 1`, userId)
		if (db.userId) {
			console.log(`In init fn 2`, userId)
			// we remove the pointers immediately, then cleanup the clx
			useDbStore.setState({ userId: null, profile: null })
			await db.profile?.cleanup()
		}
		if (userId) {
			console.log(`In init fn 3`, userId)
			// set the store values, then preload
			// preload the profile when it's done getting cleaned up
			db.profile?.utils.refetch()
			useDbStore.setState({ userId, profile: myProfileCollection })
		}
	}
}
