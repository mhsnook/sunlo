import { type RefCallback, useEffect, useRef, useState } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
	const [debounced, setDebounced] = useState<T>(value)
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delay)
		return () => clearTimeout(id)
	}, [value, delay])
	return debounced
}

export function usePrevious<T>(value: T): T | undefined {
	const ref = useRef<T | undefined>(undefined)
	useEffect(() => {
		ref.current = value
	}, [value])
	return ref.current
}

export function useIntersectionObserver(
	options: IntersectionObserverInit
): [RefCallback<Element>, IntersectionObserverEntry | undefined] {
	const [entry, setEntry] = useState<IntersectionObserverEntry | undefined>(
		undefined
	)
	const observerRef = useRef<IntersectionObserver | null>(null)

	const ref: RefCallback<Element> = (node) => {
		observerRef.current?.disconnect()
		if (!node) return
		observerRef.current = new IntersectionObserver(
			([e]) => setEntry(e),
			options
		)
		observerRef.current.observe(node)
	}

	return [ref, entry]
}
