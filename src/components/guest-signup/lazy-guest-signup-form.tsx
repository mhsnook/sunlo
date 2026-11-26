import { lazy, Suspense, type ComponentProps } from 'react'

const GuestSignupFormChunk = lazy(() =>
	import('./guest-signup-form').then((m) => ({ default: m.GuestSignupForm }))
)

/**
 * GuestSignupForm, loaded on demand. The auth gates live in the entry chunk,
 * so they render this one; a static import would put the form and its form
 * library on every first paint.
 */
export function LazyGuestSignupForm(
	props: ComponentProps<typeof GuestSignupFormChunk>
) {
	return (
		<Suspense fallback={null}>
			<GuestSignupFormChunk {...props} />
		</Suspense>
	)
}
