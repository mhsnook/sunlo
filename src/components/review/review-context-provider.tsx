import {
	createContext,
	PropsWithChildren,
	useCallback,
	useContext,
	useRef,
	useSyncExternalStore,
} from 'react'
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
 * Uses useSyncExternalStore directly to handle null store case.
 */
export function useReviewStoreOptional<T>(
	selector: (state: ReviewState) => T
): T | null {
	const store = useContext(ReviewStoreContext)

	const subscribe = useCallback(
		(callback: () => void) => {
			if (!store) return () => {}
			return store.subscribe(callback)
		},
		[store]
	)

	const getSnapshot = useCallback(() => {
		if (!store) return null
		return selector(store.getState())
	}, [store, selector])

	return useSyncExternalStore(subscribe, getSnapshot)
}
