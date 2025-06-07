import { createContext, PropsWithChildren, useContext, useRef } from 'react'
import { useStore } from 'zustand'
import {
	createReviewStore,
	ReviewState,
	ReviewStore,
} from '@/lib/use-review-store'

const ReviewStoreContext = createContext<ReviewStore | null>(null)

export function ReviewStoreProvider({
	lang,
	dayString,
	children,
}: PropsWithChildren<{
	lang: string
	dayString: string
}>) {
	const storeRef = useRef<ReturnType<typeof createReviewStore>>(null)

	if (!storeRef.current) {
		storeRef.current = createReviewStore(lang, dayString)
	}
	return (
		<ReviewStoreContext.Provider value={storeRef.current}>
			{children}
		</ReviewStoreContext.Provider>
	)
}

export function useReviewStore<T>(selector: (state: ReviewState) => T): T {
	const store = useContext(ReviewStoreContext)
	if (!store) throw new Error('Missing ReviewStoreContext in the tree')
	return useStore(store, selector)
}
