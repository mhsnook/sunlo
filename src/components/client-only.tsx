import { type ReactNode, useState, useEffect } from 'react'

interface ClientOnlyProps {
	children: ReactNode
	fallback?: ReactNode
}

/**
 * Renders children only on the client side.
 * Use this to wrap components that use browser-only APIs or
 * TanStack DB collections (which require useSyncExternalStore with getServerSnapshot).
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	return mounted ? children : fallback
}
