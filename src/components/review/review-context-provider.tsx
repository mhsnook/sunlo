import React, { createContext, useContext, useRef } from 'react'
import { createReviewStore } from '@/lib/use-review-store'

const ReviewStoreContext = createContext<ReturnType<
	typeof createReviewStore
> | null>(null)

export function ReviewStoreProvider({
	children,
}: {
	children: React.ReactNode
}) {
	const storeRef = useRef<ReturnType<typeof createReviewStore>>(null)
	if (!storeRef.current) {
		storeRef.current = createReviewStore()
	}
	return (
		<ReviewStoreContext.Provider value={storeRef.current}>
			{children}
		</ReviewStoreContext.Provider>
	)
}

export function useReviewStore() {
	const store = useContext(ReviewStoreContext)
	if (!store)
		throw new Error('useReviewStore must be used within a ReviewStoreProvider')
	return store
}
