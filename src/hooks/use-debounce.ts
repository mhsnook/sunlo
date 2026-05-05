import {
	type RefCallback,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'

export function useDebounce<T>(value: T, delay: number): T {
	const [debounced, setDebounced] = useState<T>(value)
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delay)
		return () => clearTimeout(id)
	}, [value, delay])
	return debounced
}

/**
 * Like useDebounce, but returns a flush() callback that immediately sets
 * the debounced value to the current input. Useful for "Enter key skips
 * the wait" UX on search inputs.
 */
export function useDebounceWithFlush<T>(
	value: T,
	delay: number
): [T, () => void] {
	const [debounced, setDebounced] = useState<T>(value)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const valueRef = useRef(value)
	valueRef.current = value

	useEffect(() => {
		timerRef.current = setTimeout(() => setDebounced(value), delay)
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current)
		}
	}, [value, delay])

	const flush = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current)
			timerRef.current = null
		}
		setDebounced(valueRef.current)
	}, [])

	return [debounced, flush]
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
