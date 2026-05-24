/**
 * True only during a genuine local development session.
 *
 * Dev-only UI must NOT be gated on `import.meta.env.DEV` alone: if a
 * production deploy is ever built or served in the wrong Vite mode that flag
 * flips to `true` and leaks dev tooling (the identity switcher, the
 * work-in-progress buttons behind `<Flagged>`) onto the live site. Requiring
 * a local-network hostname as well means dev UI can never render on a
 * deployed domain, even when the build mode is wrong.
 */
export function isDevEnvironment(): boolean {
	if (!import.meta.env.DEV) return false
	if (typeof window === 'undefined') return false
	const { hostname } = window.location
	return (
		hostname === 'localhost' ||
		hostname === '127.0.0.1' ||
		hostname === '::1' ||
		hostname === '[::1]' ||
		hostname.endsWith('.local') ||
		hostname.startsWith('10.') ||
		hostname.startsWith('192.168.') ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
	)
}
