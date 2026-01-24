import { createContext, PropsWithChildren, useContext, useRef } from 'react'
import { useStore } from 'zustand'
import {
	createReviewStore,
	ReviewState,
	ReviewStore,
} from '@/hooks/use-review-store'

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

/**
 * Optional version of useReviewStore that returns null if outside context.
 * Useful for components that may or may not be inside a ReviewStoreProvider.
 */
export function useReviewStoreOptional<T>(
	selector: (state: ReviewState) => T
): T | null {
	const store = useContext(ReviewStoreContext)
	const value = useStore(store!, selector)
	return store ? value : null
}
