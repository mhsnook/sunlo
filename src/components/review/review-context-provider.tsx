import { PropsWithChildren, useRef } from 'react'
import { createReviewStore, ReviewStoreContext } from '@/features/review/store'

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
